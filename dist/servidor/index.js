/**
 * A parte servidor do componente, a instalar no software do cliente (K16,
 * requisito 13 do mapa do v1). Num só Route Handler do Next:
 *
 *   // app/api/mube/[...caminho]/route.ts
 *   import { criarRotasMube, armazemSupabase } from "@mubesystems/componente-operacional/servidor"
 *   export const { GET, POST, PUT, PATCH, DELETE } = criarRotasMube({
 *     utilizador: async () => { … quem tem sessão no software do cliente … },
 *     armazem: armazemSupabase(supabaseComServiceRole),
 *   })
 *
 * O navegador só fala com estas rotas; a chave do projeto fica aqui (requisito
 * 1). Quem pede é sempre o utilizador da sessão do software do cliente, nunca
 * um id vindo do navegador.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
export { armazemEmMemoria, armazemSupabase } from "./armazem";
class Falha extends Error {
    estado;
    codigo;
    constructor(estado, codigo, mensagem) {
        super(mensagem);
        this.estado = estado;
        this.codigo = codigo;
    }
}
const json = (corpo, estado = 200) => Response.json(corpo, { status: estado, headers: { "Cache-Control": "no-store" } });
const ESTADOS = {
    relato: "Relato",
    triagem: "Triagem",
    contencao: "Contenção",
    correcao: "Correção",
    em_validacao: "Em Validação",
    aguardando_aceite: "Aguardando Aceite",
    concluida: "Concluída",
    descartada: "Encerrado",
};
export function criarRotasMube(config) {
    const url = (config.url ?? process.env.MUBE_URL ?? "").replace(/\/$/, "");
    const chave = config.chave ?? process.env.MUBE_CHAVE ?? "";
    const clienteId = config.clienteId ?? process.env.MUBE_CLIENTE_ID ?? "";
    const projetoId = config.projetoId ?? process.env.MUBE_PROJETO_ID ?? "";
    const { armazem } = config;
    // ─── A API da plataforma ──────────────────────────────────────────────────
    async function plataforma(metodo, caminho, corpo) {
        if (!url || !chave || !clienteId || !projetoId)
            throw new Falha(500, "mube_por_configurar", "Faltam MUBE_URL, MUBE_CHAVE, MUBE_CLIENTE_ID ou MUBE_PROJETO_ID.");
        let r;
        try {
            r = await fetch(`${url}/api/v1${caminho}`, {
                method: metodo,
                headers: { Authorization: `Bearer ${chave}`, "X-Mube-Cliente": clienteId, "X-Mube-Projeto": projetoId, "Content-Type": "application/json" },
                body: corpo === undefined ? undefined : JSON.stringify(corpo),
                cache: "no-store",
                signal: AbortSignal.timeout(20000),
            });
        }
        catch {
            throw new Falha(502, "plataforma_indisponivel", "Não foi possível contactar o suporte. Tenta de novo daqui a pouco.");
        }
        const dados = (await r.json().catch(() => null));
        if (!r.ok)
            throw new Falha(r.status, dados?.erro?.codigo ?? "erro", dados?.erro?.mensagem ?? "O suporte não respondeu como esperado.");
        return dados;
    }
    /** Lê o ticket da plataforma e guarda-o na cópia. */
    async function atualizarTicket(numero) {
        const { ticket } = await plataforma("GET", `/tickets/${numero}`);
        await armazem.guardarTickets([semUrls(ticket)]);
        return ticket;
    }
    /** A primeira cópia: todos os tickets do projeto, página a página. */
    async function sincronizar() {
        let antes = null;
        do {
            const pagina = await plataforma("GET", `/tickets${antes ? `?antes=${antes}` : ""}`);
            await armazem.guardarTickets(pagina.tickets);
            antes = pagina.seguinte;
        } while (antes);
        await armazem.marcarSincronizado();
    }
    // ─── Webhook (S26, S27): a plataforma avisa, a cópia atualiza-se ───────────
    async function webhook(request) {
        const corpo = await request.text();
        const assinatura = request.headers.get("x-mube-assinatura") ?? "";
        const esperada = `sha256=${createHmac("sha256", chave).update(corpo).digest("hex")}`;
        // Requisito 8: só se aceita o que a plataforma assinou com a chave do projeto.
        if (!chave || assinatura.length !== esperada.length || !timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))) {
            return json({ erro: { codigo: "assinatura_invalida", mensagem: "Assinatura inválida." } }, 401);
        }
        const evento = JSON.parse(corpo);
        // Requisito 9: o mesmo evento pode chegar mais de uma vez.
        if (!(await armazem.eventoNovo(evento.id)))
            return json({ ok: true, repetido: true });
        const ticket = evento.dados.ticket;
        if (ticket) {
            try {
                await atualizarTicket(ticket.numero);
            }
            catch {
                // Sem a leitura, fica pelo menos o estado que veio no evento.
                if (evento.tipo === "estado") {
                    await armazem.guardarTickets([
                        { numero: ticket.numero, codigo: ticket.codigo, estado: evento.dados.estado, estado_rotulo: ESTADOS[evento.dados.estado] },
                    ]);
                }
            }
        }
        const aviso = notificacaoDoEvento(evento);
        if (aviso)
            await armazem.guardarNotificacao(aviso);
        // 2xx dentro do tempo limite: conta como entregue (S28, S32).
        return json({ ok: true });
    }
    // ─── O pedido do navegador ────────────────────────────────────────────────
    async function tratar(request, contexto) {
        const caminho = ((await contexto.params).caminho ?? []).join("/");
        const metodo = request.method.toUpperCase();
        try {
            if (metodo === "POST" && caminho === "webhook")
                return await webhook(request);
            const quem = await config.utilizador(request);
            const escolha = quem ? (await armazem.liberados()).find((l) => l.id === quem.id) : undefined;
            const liberado = quem ? (quem.liberado ?? Boolean(escolha)) : false;
            // A Drive só com o suporte; por omissão, quem tem o suporte vê-a.
            const drive = liberado && (quem?.drive ?? escolha?.drive ?? true);
            const gestor = Boolean(quem?.gestor);
            if (metodo === "GET" && caminho === "sessao") {
                return json({ utilizador: quem ? { id: quem.id, nome: quem.nome ?? null } : null, liberado, drive, gestor });
            }
            if (!quem)
                throw new Falha(401, "sem_sessao", "Entre no software para usar o suporte.");
            // Acessos: o gestor escolhe, da equipa do software, quem usa o suporte (S14, S18).
            if (caminho === "acessos") {
                if (!gestor)
                    throw new Falha(403, "sem_permissao", "Só quem gere o software escolhe os acessos ao suporte.");
                if (!config.equipa)
                    throw new Falha(501, "equipa_por_configurar", "Falta indicar a equipa do software (opção `equipa`).");
                const equipa = await config.equipa();
                if (metodo === "GET") {
                    const escolhas = new Map((await armazem.liberados()).map((l) => [l.id, l.drive]));
                    return json({ equipa: equipa.map((p) => ({ ...p, liberado: escolhas.has(p.id), drive: escolhas.get(p.id) ?? false })) });
                }
                if (metodo === "PUT") {
                    // { acessos: [{ id, drive }] }; `{ ids }` (versões anteriores) dá a Drive a todos.
                    const pedido = (await request.json().catch(() => ({})));
                    const lista = Array.isArray(pedido.acessos)
                        ? pedido.acessos
                        : Array.isArray(pedido.ids)
                            ? pedido.ids.map((id) => ({ id, drive: true }))
                            : null;
                    if (!lista || lista.some((a) => !a || typeof a.id !== "string"))
                        throw new Falha(400, "acessos_invalidos", "Indique a lista de pessoas.");
                    const daEquipa = new Map(equipa.map((p) => [p.id, p]));
                    const escolhidos = [
                        ...new Map(lista.filter((a) => daEquipa.has(a.id)).map((a) => [a.id, { id: a.id, drive: a.drive !== false }])).values(),
                    ];
                    // Primeiro a plataforma: se falhar, nada muda aqui.
                    await plataforma("PUT", "/liberados", {
                        utilizadores: escolhidos.map((a) => {
                            const p = daEquipa.get(a.id);
                            return { id: p.id, nome: p.nome ?? null, email: p.email ?? null, fotoUrl: p.fotoUrl ?? null, drive: a.drive };
                        }),
                    });
                    await armazem.definirLiberados(escolhidos);
                    return json({ liberados: escolhidos.length, comDrive: escolhidos.filter((a) => a.drive).length });
                }
            }
            if (!liberado)
                throw new Falha(403, "nao_liberado", "Não tem acesso ao suporte deste projeto.");
            const utilizador = { id: quem.id, nome: quem.nome ?? null, email: quem.email ?? null, fotoUrl: quem.fotoUrl ?? null };
            const corpo = async () => ({ ...(await request.json().catch(() => ({}))), utilizador });
            const partes = caminho.split("/");
            // Tickets: lidos da cópia; o detalhe tenta a plataforma primeiro.
            if (metodo === "GET" && caminho === "tickets") {
                if (!(await armazem.sincronizado()))
                    await sincronizar().catch(() => undefined);
                const [tickets, avisos] = await Promise.all([armazem.tickets(), armazem.notificacoes(quem.id, 300)]);
                const porLer = new Set(avisos.filter((n) => !n.lida && n.ticket_numero).map((n) => n.ticket_numero));
                return json({ tickets: tickets.map((t) => ({ ...t, nao_lido: porLer.has(t.numero) })) });
            }
            if (metodo === "GET" && partes[0] === "tickets" && partes.length === 2) {
                const numero = Number(partes[1]);
                try {
                    return json({ ticket: await atualizarTicket(numero), defasado: false });
                }
                catch (e) {
                    const copia = await armazem.ticket(numero);
                    if (!copia)
                        throw e;
                    // A plataforma não respondeu: mostra-se a cópia, com o aviso de que pode estar atrasada.
                    return json({ ticket: copia, defasado: true });
                }
            }
            if (metodo === "POST" && caminho === "relatos") {
                const r = await plataforma("POST", "/relatos", await corpo());
                await armazem.guardarTickets([semUrls(r.ticket)]);
                if (!r.repetido) {
                    await armazem.guardarNotificacao({
                        id: `recebido-${r.ticket.id}`,
                        tipo: "recebido",
                        ticket_numero: r.ticket.numero,
                        titulo: "O seu relato foi recebido",
                        corpo: `${r.ticket.codigo} entrou na fila de triagem.`,
                        criado_em: new Date().toISOString(),
                    });
                }
                return json(r, 201);
            }
            if (metodo === "POST" && partes[0] === "tickets" && partes.length === 3 && ["comentarios", "aceite", "recusa"].includes(partes[2])) {
                const r = await plataforma("POST", `/${caminho}`, await corpo());
                await atualizarTicket(Number(partes[1])).catch(() => undefined);
                return json(r, partes[2] === "comentarios" ? 201 : 200);
            }
            // Ficheiros: o corpo é o ficheiro, que segue em stream até ao R2 (sem CORS no navegador).
            if (metodo === "POST" && caminho === "ficheiros")
                return json(await enviarFicheiro(request, utilizador), 201);
            // Drive: só para quem a pode ver; segue para a plataforma, com o utilizador da sessão.
            if (partes[0] === "drive") {
                // S59: a Drive é escolhida por pessoa, entre os liberados.
                if (!drive)
                    throw new Falha(403, "sem_drive", "Não tem acesso à Drive deste projeto.");
                if (metodo === "GET")
                    return json(await plataforma("GET", `/${caminho}${new URL(request.url).search}`));
                if (["POST", "PATCH", "DELETE"].includes(metodo))
                    return json(await plataforma(metodo, `/${caminho}`, await corpo()), metodo === "POST" ? 201 : 200);
            }
            // Notificações: só na cópia.
            if (metodo === "GET" && caminho === "notificacoes")
                return json({ notificacoes: (await armazem.notificacoes(quem.id)).map((n) => paraQuem(n, quem.id)) });
            if (metodo === "POST" && caminho === "notificacoes/lidas") {
                const { ids } = (await request.json().catch(() => ({})));
                await armazem.marcarLidas(quem.id, ids === "todas" || !ids ? "todas" : ids.slice(0, 500));
                return json({ ok: true });
            }
            throw new Falha(404, "rota_inexistente", "Rota desconhecida.");
        }
        catch (e) {
            if (e instanceof Falha)
                return json({ erro: { codigo: e.codigo, mensagem: e.message } }, e.estado);
            console.error("[mube]", e);
            return json({ erro: { codigo: "interno", mensagem: "Erro inesperado no suporte." } }, 500);
        }
    }
    async function enviarFicheiro(request, utilizador) {
        if (!request.body)
            throw new Falha(400, "ficheiro_vazio", "O ficheiro veio vazio.");
        let nome = "ficheiro";
        try {
            nome = decodeURIComponent(request.headers.get("x-nome") ?? "").trim().slice(0, 200) || nome;
        }
        catch {
            // nome mal codificado: fica o genérico
        }
        const tipoMime = (request.headers.get("content-type") ?? "").split(";")[0].trim() || "application/octet-stream";
        const tamanho = Number(request.headers.get("content-length") ?? 0);
        const pedido = await plataforma("POST", "/ficheiros", { utilizador, nome, tipoMime, tamanhoBytes: tamanho });
        const envio = await fetch(pedido.url_de_envio, {
            method: "PUT",
            headers: { "Content-Type": tipoMime, ...(tamanho ? { "Content-Length": String(tamanho) } : {}) },
            body: request.body,
            // @ts-expect-error -- o fetch do Node precisa de `duplex` para enviar um stream.
            duplex: "half",
        });
        if (!envio.ok)
            throw new Falha(502, "envio_falhou", "Não foi possível guardar o ficheiro. Tenta outra vez.");
        const confirmado = await plataforma("POST", `/ficheiros/${pedido.id}/confirmar`);
        return { id: pedido.id, nome, tipo_mime: tipoMime, tamanho_bytes: confirmado.tamanho_bytes ?? tamanho };
    }
    const rota = (request, contexto) => tratar(request, contexto);
    return { GET: rota, POST: rota, PUT: rota, PATCH: rota, DELETE: rota };
}
/**
 * A lista de quem o software do cliente liberou neste projeto (S14, S18).
 * Chamar quando a lista muda (e uma vez na instalação): quem não vier deixa de
 * estar liberado na plataforma.
 */
export async function sincronizarLiberados(utilizadores, config = {}) {
    const url = (config.url ?? process.env.MUBE_URL ?? "").replace(/\/$/, "");
    const r = await fetch(`${url}/api/v1/liberados`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${config.chave ?? process.env.MUBE_CHAVE ?? ""}`,
            "X-Mube-Cliente": config.clienteId ?? process.env.MUBE_CLIENTE_ID ?? "",
            "X-Mube-Projeto": config.projetoId ?? process.env.MUBE_PROJETO_ID ?? "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ utilizadores }),
    });
    const dados = await r.json().catch(() => null);
    if (!r.ok)
        throw new Error(dados?.erro?.mensagem ?? `A plataforma respondeu ${r.status}.`);
    return dados;
}
/** As URLs assinadas caducam numa hora: não vale a pena guardá-las na cópia. */
function semUrls(t) {
    const limpar = (f) => {
        const { url: _url, ...resto } = f;
        void _url;
        return resto;
    };
    return {
        ...t,
        relatos: t.relatos?.map((r) => ({ ...r, anexos: r.anexos.map(limpar) })),
        comentarios: t.comentarios?.map((c) => ({ ...c, anexos: c.anexos.map(limpar) })),
    };
}
/** S19: o que o evento vira na central de notificações do componente. Nunca há aviso interno. */
/** O aviso como cada pessoa o vê: a resposta em que foi mencionada passa a menção. */
function paraQuem(n, utilizadorId) {
    if (n.tipo !== "comentario" || !n.mencionados?.includes(utilizadorId))
        return n;
    const codigo = n.ticket_numero ? `COR-${String(n.ticket_numero).padStart(3, "0")}` : null;
    return { ...n, tipo: "mencao", titulo: codigo ? `Menção da equipa em ${codigo}` : "Menção da equipa" };
}
function notificacaoDoEvento(evento) {
    const ticket = evento.dados.ticket;
    if (!ticket)
        return null;
    const base = { id: evento.id, ticket_numero: ticket.numero, criado_em: evento.ocorrido_em };
    if (evento.tipo === "estado") {
        const estado = evento.dados.estado;
        if (estado === "concluida")
            return { ...base, tipo: "concluido", titulo: "Ticket concluído", corpo: `${ticket.codigo} foi concluído.` };
        if (estado === "aguardando_aceite")
            return null; // o pedido de aceite tem aviso próprio
        if (estado === "descartada") {
            const descarte = evento.dados.descarte;
            return { ...base, tipo: "estado", titulo: "Ticket encerrado", corpo: `${ticket.codigo} foi encerrado${descarte?.rotulo ? `: ${descarte.rotulo}` : ""}.` };
        }
        return { ...base, tipo: "estado", titulo: "Estado atualizado", corpo: `${ticket.codigo} passou para ${ESTADOS[estado] ?? estado}.` };
    }
    if (evento.tipo === "comentario_externo") {
        const c = evento.dados.comentario;
        const texto = (c?.corpo ?? "").replace(/\s+/g, " ").slice(0, 120);
        // Quem foi mencionado vê este aviso como menção (ver `paraQuem`).
        const mencionados = (c?.mencoes ?? []).map((m) => m.id).filter(Boolean);
        return { ...base, tipo: "comentario", titulo: "Nova resposta da equipa", corpo: `${ticket.codigo}: “${texto}”`, ...(mencionados.length ? { mencionados } : {}) };
    }
    if (evento.tipo === "pedido_aceite") {
        // S32, T1: entrada, lembrete e encerramento.
        const fase = evento.dados.fase;
        const titulo = fase === "lembrete" ? "Lembrete: correção à espera do seu aceite" : fase === "encerramento" ? "Último aviso antes do aceite automático" : "Correção à espera do seu aceite";
        const corpo = fase === "encerramento"
            ? `Sem resposta, ${ticket.codigo} é dado como aceite. Aceite ou recuse agora.`
            : `${ticket.codigo} está pronto para validar. Aceite ou recuse.`;
        return { ...base, tipo: "aceite_pendente", titulo, corpo };
    }
    return null;
}
