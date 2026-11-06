/**
 * A parte servidor do componente, a instalar no software do cliente (K16,
 * requisito 13 do mapa do v1). Num só Route Handler do Next:
 *
 *   // app/api/mube/[...caminho]/route.ts
 *   import { criarRotasMube, armazemSupabase } from "@mubesystems/componente-operacional/servidor"
 *   export const { GET, POST, PUT, PATCH, DELETE } = criarRotasMube({
 *     utilizador: async () => { … quem tem sessão no software do cliente … },
 *     armazem: armazemSupabase(supabaseComServiceRole),
 *     // conversas: true,   // as conversas com a Mube (v0.6.0), desligadas por omissão
 *     // relatosAbertos: true,   // qualquer pessoa reporta (v0.7.0), desligado por omissão
 *   })
 *
 * O navegador só fala com estas rotas; a chave do projeto fica aqui (requisito
 * 1). Quem pede é sempre o utilizador da sessão do software do cliente, nunca
 * um id vindo do navegador.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { VERSAO } from "../gerado/versao.js";
import { textoDoMarkdown } from "../markdown.js";
export { armazemEmMemoria, armazemSupabase } from "./armazem.js";
const HORA_MS = 3_600_000;
const MINUTO_MS = 60_000;
/** Quanto o webhook espera pelo `aoMudarTicket` antes de responder (a plataforma dá 10 s). */
const GANCHO_MS = 5_000;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
    // ─── Conversas com a Mube (v0.6.0, D5 a D9) ────────────────────────────────
    /** A cópia das conversas; um armazém feito à mão para a v0.4 não a tem. */
    function copiaDeConversas() {
        const a = armazem;
        const precisa = ["guardarConversas", "conversa", "conversasDe", "participantesDe", "guardarMensagens", "mensagens", "marcarConversaLida", "porLer"];
        if (precisa.some((k) => typeof a[k] !== "function")) {
            throw new Falha(501, "armazem_sem_conversas", "O armazém não guarda conversas. Use o armazemSupabase (ou o armazemEmMemoria) da v0.6.");
        }
        return a;
    }
    /** A cópia é uma conveniência: com a plataforma a responder, falhar a guardar não falha o pedido. */
    async function naCopia(fazer) {
        try {
            await fazer();
        }
        catch (e) {
            console.error("[mube] conversas: a cópia falhou (o SQL do pacote foi reaplicado?)", e);
        }
    }
    async function avisarSoftware(conversaId, ids) {
        if (!config.aoMudarConversas)
            return;
        try {
            await config.aoMudarConversas(conversaId, [...new Set(ids)]);
        }
        catch (e) {
            console.error("[mube] aoMudarConversas", e);
        }
    }
    /** A equipa do software (de `config.equipa`), guardada 5 minutos: o contador pergunta muitas vezes. */
    let equipaEmCache = null;
    async function naEquipa(id) {
        if (!config.equipa)
            return true;
        if (!equipaEmCache || Date.now() - equipaEmCache.em > 5 * MINUTO_MS) {
            try {
                equipaEmCache = { ids: new Set((await config.equipa()).map((p) => p.id)), em: Date.now() };
            }
            catch {
                return true;
            }
        }
        return equipaEmCache.ids.has(id);
    }
    async function enviarEquipa() {
        if (!config.equipa)
            return;
        const equipa = await config.equipa();
        await plataforma("PUT", "/equipa", { utilizadores: equipa.map((p) => ({ id: p.id, nome: p.nome ?? null, email: p.email ?? null, fotoUrl: p.fotoUrl ?? null })) });
    }
    // D5: declara as capacidades e envia a equipa ao arrancar (no primeiro
    // pedido, sem o atrasar) e de hora a hora. Se a plataforma estiver em baixo,
    // tenta outra vez passado um minuto; nunca rebenta um pedido por isto.
    let ativacao = null;
    let declaradaEm = 0;
    let tentadaEm = 0;
    function ativar() {
        // Sem a opção (nem `false`), o mesmo que a v0.5: não se declara nada.
        if (config.conversas === undefined)
            return null;
        if (ativacao)
            return ativacao;
        const agora = Date.now();
        if (declaradaEm && agora - declaradaEm < HORA_MS)
            return null;
        if (agora - tentadaEm < MINUTO_MS)
            return null;
        tentadaEm = agora;
        ativacao = (async () => {
            await plataforma("PUT", "/capacidades", { versao: VERSAO, conversas: Boolean(config.conversas) });
            if (config.conversas)
                await enviarEquipa();
            declaradaEm = Date.now();
        })()
            .catch((e) => console.error("[mube] conversas: não foi possível declarar à plataforma", e instanceof Error ? e.message : e))
            .finally(() => {
            ativacao = null;
        });
        return ativacao;
    }
    const indisponivel = (e) => e instanceof Falha && (e.codigo === "plataforma_indisponivel" || e.estado >= 500);
    /** D6: o evento `mensagem` ou `conversa` guardado na cópia, e o aviso ao software. */
    async function guardarEventoDeConversa(tipo, dados) {
        const copia = copiaDeConversas();
        const conversa = dados.conversa;
        if (!conversa?.id)
            return;
        // Quem a via antes também é avisado (ex.: saiu da TaskForce, ou foi arquivada).
        const antes = await copia.participantesDe(conversa.id).catch(() => []);
        await copia.guardarConversas([conversa]);
        if (tipo === "mensagem") {
            const mensagem = dados.mensagem;
            if (mensagem?.id)
                await copia.guardarMensagens([mensagem]);
        }
        await avisarSoftware(conversa.id, [...antes, ...conversa.participantes.map((p) => p.id)]);
    }
    /** As rotas `conversas/*` e `equipa-mube`, sempre com a pessoa da sessão (D7). */
    async function rotaDeConversas(request, metodo, partes, quem) {
        if (!config.conversas)
            throw new Falha(404, "rota_inexistente", "Rota desconhecida.");
        const copia = copiaDeConversas();
        // A primeira vez: espera pela declaração, senão a plataforma ainda diz que estão desligadas.
        await ativar();
        const utilizador = { id: quem.id, nome: quem.nome ?? null, email: quem.email ?? null, fotoUrl: quem.fotoUrl ?? null };
        const doPedido = async () => (await request.json().catch(() => ({})));
        const quemNoUrl = `utilizador=${encodeURIComponent(quem.id)}`;
        if (partes[0] === "equipa-mube" && partes.length === 1 && metodo === "GET") {
            try {
                const r = await plataforma("GET", `/equipa-mube?${quemNoUrl}`);
                return json({ membros: r.membros, conversaIndividual: true });
            }
            catch (e) {
                // Quem não pode ter conversa individual não vê os membros da Mube: lista vazia, sem erro.
                if (e instanceof Falha && e.codigo === "sem_conversa_individual")
                    return json({ membros: [], conversaIndividual: false });
                throw e;
            }
        }
        if (partes.length === 1 && metodo === "GET") {
            try {
                const r = await plataforma("GET", `/conversas?${quemNoUrl}`);
                await naCopia(() => copia.guardarConversas(r.conversas));
                return json({ conversas: r.conversas, defasado: false });
            }
            catch (e) {
                if (!indisponivel(e))
                    throw e;
                // A plataforma não respondeu: a cópia, com o aviso de que pode estar atrasada.
                const lista = await copia.conversasDe(quem.id);
                const porLer = await copia.porLer(quem.id, lista.map((c) => c.id));
                const conversas = lista
                    .map((c) => ({ ...c, por_ler: porLer.get(c.id) ?? 0 }))
                    .sort((a, b) => (b.ultima_mensagem_em ?? b.criada_em).localeCompare(a.ultima_mensagem_em ?? a.criada_em));
                return json({ conversas, defasado: true });
            }
        }
        if (partes[1] === "individual" && partes.length === 2 && metodo === "POST") {
            const { pessoaId } = await doPedido();
            const r = await plataforma("POST", "/conversas/individual", { utilizador, pessoaId });
            await naCopia(() => copia.guardarConversas([r.conversa]));
            return json(r);
        }
        // Os ficheiros de uma mensagem: basta estar na equipa (não é preciso o suporte).
        if (partes[1] === "ficheiros" && partes.length === 2 && metodo === "POST")
            return json(await enviarFicheiro(request, utilizador, "conversa"), 201);
        // v0.7.0: o contador do menu (`useNaoLidosMube`) lê da cópia, sem ir à
        // plataforma: os eventos `mensagem`/`conversa` do webhook e as leituras
        // (`mube_conversa_leituras`) mantêm-na em dia. Se a cópia falhar (o SQL
        // por reaplicar), pergunta-se à plataforma, como até à 0.6.
        if (partes[1] === "por-ler" && partes.length === 2 && metodo === "GET") {
            let lista;
            let porLer;
            try {
                lista = await copia.conversasDe(quem.id);
                porLer = await copia.porLer(quem.id, lista.map((c) => c.id));
            }
            catch (e) {
                console.error("[mube] conversas: o contador não leu a cópia; pergunta à plataforma", e);
                const r = await plataforma("GET", `/conversas?${quemNoUrl}`);
                await naCopia(() => copia.guardarConversas(r.conversas));
                return json({ naoLidos: r.conversas.reduce((n, c) => n + (c.por_ler ?? 0), 0), conversas: r.conversas.length, fonte: "plataforma" });
            }
            // Sem conversas na cópia: quem não está na equipa não tem as conversas ligadas (como a plataforma diria).
            if (!lista.length && !(await naEquipa(quem.id)))
                throw new Falha(403, "fora_da_equipa", "Não está na equipa deste software.");
            return json({ naoLidos: [...porLer.values()].reduce((n, v) => n + v, 0), conversas: lista.length, fonte: "copia" });
        }
        const id = partes[1];
        if (!id || !ID.test(id))
            throw new Falha(404, "conversa_inexistente", "Essa conversa não existe.");
        if (partes[2] === "mensagens" && partes.length === 3 && metodo === "GET") {
            const antes = new URL(request.url).searchParams.get("antes");
            try {
                const r = await plataforma("GET", `/conversas/${id}/mensagens?${quemNoUrl}${antes ? `&antes=${encodeURIComponent(antes)}` : ""}`);
                await naCopia(async () => {
                    await copia.guardarConversas([r.conversa]);
                    await copia.guardarMensagens(r.mensagens);
                });
                return json({ ...r, defasado: false });
            }
            catch (e) {
                if (!indisponivel(e))
                    throw e;
                const conversa = await copia.conversa(id);
                // D7: na cópia também só vê quem participa.
                if (!conversa || conversa.arquivada || !conversa.participantes.some((p) => p.id === quem.id))
                    throw new Falha(404, "conversa_inexistente", "Essa conversa não existe.");
                const mensagens = await copia.mensagens(id, { antes, limite: 50 });
                return json({ conversa, mensagens, seguinte: mensagens.length === 50 ? mensagens[0].criada_em : null, defasado: true });
            }
        }
        if (partes[2] === "mensagens" && partes.length === 3 && metodo === "POST") {
            const { corpo, respostaA, ficheiros } = await doPedido();
            let r;
            try {
                r = await plataforma("POST", `/conversas/${id}/mensagens`, { utilizador, corpo, respostaA: respostaA ?? undefined, ficheiros });
            }
            catch (e) {
                if (indisponivel(e))
                    throw new Falha(502, "plataforma_indisponivel", "A mensagem não foi enviada: a Mube não respondeu. Tente de novo daqui a pouco.");
                throw e;
            }
            await naCopia(() => copia.guardarMensagens([r.mensagem]));
            await avisarSoftware(id, await copia.participantesDe(id).catch(() => [quem.id]));
            return json(r, 201);
        }
        if (partes[2] === "mensagens" && partes.length === 4 && ID.test(partes[3]) && (metodo === "PATCH" || metodo === "DELETE")) {
            const pedido = metodo === "PATCH" ? await doPedido() : {};
            try {
                await plataforma(metodo, `/conversas/${id}/mensagens/${partes[3]}`, { utilizador, ...(metodo === "PATCH" ? { corpo: pedido.corpo } : {}) });
            }
            catch (e) {
                if (indisponivel(e))
                    throw new Falha(502, "plataforma_indisponivel", "Não foi possível mudar a mensagem: a Mube não respondeu. Tente de novo daqui a pouco.");
                throw e;
            }
            // O evento da plataforma traz a mensagem como ficou; até lá, a cópia já mostra a mudança.
            await naCopia(async () => {
                const [atual] = (await copia.mensagens(id, { limite: 500 })).filter((m) => m.id === partes[3]);
                if (atual) {
                    await copia.guardarMensagens([
                        metodo === "DELETE"
                            ? { ...atual, apagada: true, corpo: null, anexos: [], reacoes: [] }
                            : { ...atual, editada: true, corpo: typeof pedido.corpo === "string" ? pedido.corpo : atual.corpo },
                    ]);
                }
            });
            await avisarSoftware(id, await copia.participantesDe(id).catch(() => [quem.id]));
            return json({ ok: true });
        }
        if (partes[2] === "lidas" && partes.length === 3 && metodo === "POST") {
            const { ate } = await doPedido();
            // O `ate` (a hora da última mensagem) guarda-se tal como veio: as horas da
            // plataforma têm microssegundos, e cortá-las aos milissegundos deixava a
            // última mensagem por ler no contador da cópia (v0.7.0). Só não se aceita
            // uma hora no futuro (com 5 min de folga para os relógios).
            const lida = typeof ate === "string" ? Date.parse(ate) : Number.NaN;
            const quando = typeof ate === "string" && !Number.isNaN(lida) && lida <= Date.now() + 5 * MINUTO_MS ? ate : new Date().toISOString();
            await naCopia(() => copia.marcarConversaLida(id, quem.id, quando));
            try {
                await plataforma("POST", `/conversas/${id}/lidas`, { utilizador, ate: quando });
            }
            catch (e) {
                // Ler fica registado aqui; a plataforma acerta da próxima vez.
                if (!indisponivel(e))
                    throw e;
                return json({ ok: true, defasado: true });
            }
            return json({ ok: true });
        }
        throw new Falha(404, "rota_inexistente", "Rota desconhecida.");
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
        // D6: as conversas guardam-se pela id da conversa e da mensagem, por isso
        // repetir não duplica; se a cópia falhar, a resposta não é 2xx e a
        // plataforma volta a tentar. Nunca criam avisos do suporte (`mube_notificacoes`).
        if (evento.tipo === "mensagem" || evento.tipo === "conversa") {
            if (config.conversas)
                await guardarEventoDeConversa(evento.tipo, evento.dados);
            return json({ ok: true });
        }
        // Requisito 9: o mesmo evento pode chegar mais de uma vez.
        if (!(await armazem.eventoNovo(evento.id)))
            return json({ ok: true, repetido: true });
        const ticket = evento.dados.ticket;
        const tipoDoEvento = tipoDoTicket(evento.dados.tipo);
        if (ticket) {
            try {
                await atualizarTicket(ticket.numero);
            }
            catch {
                // Sem a leitura, fica pelo menos o estado (e o tipo) que veio no evento.
                if (evento.tipo === "estado") {
                    await armazem.guardarTickets([
                        {
                            numero: ticket.numero,
                            codigo: ticket.codigo,
                            estado: evento.dados.estado,
                            estado_rotulo: ESTADOS[evento.dados.estado],
                            ...(tipoDoEvento ? { tipo: tipoDoEvento } : {}),
                        },
                    ]);
                }
            }
        }
        const aviso = notificacaoDoEvento(evento);
        if (aviso)
            await armazem.guardarNotificacao(aviso);
        if (evento.tipo === "estado" && ticket)
            await chamarAoMudarTicket(ticket, evento.dados);
        // 2xx dentro do tempo limite: conta como entregue (S28, S32).
        return json({ ok: true });
    }
    /**
     * v0.7.0: o gancho do software, depois de a cópia se atualizar. Quem
     * relatou e o tipo vêm do evento (a cópia de reserva, quando a leitura
     * falha, não os tem); a cópia só completa o nome. Nunca falha o webhook:
     * o evento já está marcado como visto e não volta a ser tratado.
     */
    async function chamarAoMudarTicket(ticket, dados) {
        if (!config.aoMudarTicket)
            return;
        try {
            const copia = await armazem.ticket(ticket.numero).catch(() => null);
            const doEvento = dados.relatado_por;
            const idDoEvento = typeof doEvento?.id === "string" && doEvento.id ? doEvento.id : null;
            // Uma plataforma anterior à 0.7 não manda `relatado_por`: fica o da cópia.
            const id = doEvento === undefined ? (copia?.relatado_por?.id ?? null) : idDoEvento;
            const relatadoPor = id ? { id, nome: copia?.relatado_por?.id === id ? (copia.relatado_por.nome ?? null) : null } : null;
            const estado = dados.estado;
            const mudanca = {
                ticket: copia ?? { numero: ticket.numero, codigo: ticket.codigo, estado, estado_rotulo: ESTADOS[estado] },
                estado,
                estadoAnterior: dados.estado_anterior ?? null,
                tipo: tipoDoTicket(dados.tipo) ?? copia?.tipo ?? "erro",
                relatadoPor,
            };
            let espera;
            const tempo = new Promise((resolver) => {
                espera = setTimeout(() => resolver("tempo"), GANCHO_MS);
            });
            const fim = await Promise.race([Promise.resolve(config.aoMudarTicket(mudanca)).then(() => "ok"), tempo]).finally(() => clearTimeout(espera));
            if (fim === "tempo")
                console.error(`[mube] aoMudarTicket: ${ticket.codigo} demorou mais de ${GANCHO_MS / 1000} s; o webhook respondeu sem esperar`);
        }
        catch (e) {
            console.error("[mube] aoMudarTicket", e);
        }
    }
    // ─── O pedido do navegador ────────────────────────────────────────────────
    async function tratar(request, contexto) {
        const caminho = ((await contexto.params).caminho ?? []).join("/");
        const metodo = request.method.toUpperCase();
        try {
            if (metodo === "POST" && caminho === "webhook")
                return await webhook(request);
            // D5: com a opção das conversas, declará-las (no primeiro pedido e de hora a hora), sem esperar.
            void ativar();
            const quem = await config.utilizador(request);
            const escolha = quem ? (await armazem.liberados()).find((l) => l.id === quem.id) : undefined;
            const liberado = quem ? (quem.liberado ?? Boolean(escolha)) : false;
            // A Drive só com o suporte; por omissão, quem tem o suporte vê-a.
            const drive = liberado && (quem?.drive ?? escolha?.drive ?? true);
            // As credenciais (S63) também se escolhem por pessoa; por omissão, não.
            const credenciais = liberado && (quem?.credenciais ?? escolha?.credenciais ?? false);
            const gestor = Boolean(quem?.gestor);
            // v0.7.0: com `relatosAbertos`, qualquer pessoa com sessão reporta.
            const podeRelatar = liberado || (Boolean(config.relatosAbertos) && Boolean(quem));
            if (metodo === "GET" && caminho === "sessao") {
                // S65: se já fez o tour, só da cópia do próprio software.
                const tour = quem && (liberado || gestor) ? await armazem.tour(quem.id).catch(() => null) : null;
                return json({
                    utilizador: quem ? { id: quem.id, nome: quem.nome ?? null } : null,
                    liberado,
                    drive,
                    credenciais,
                    gestor,
                    tour,
                    conversas: Boolean(config.conversas),
                    relatar: podeRelatar,
                });
            }
            if (!quem)
                throw new Falha(401, "sem_sessao", "Entre no software para usar o suporte.");
            // O tour guiado (S65): fica marcado aqui, na cópia; o tour em si não pede nada à plataforma.
            if (metodo === "POST" && caminho === "tour") {
                const { estado } = (await request.json().catch(() => ({})));
                if (estado !== "concluido" && estado !== "dispensado")
                    throw new Falha(400, "estado_invalido", "Estado do tour inválido.");
                await armazem.marcarTour(quem.id, estado);
                return json({ ok: true });
            }
            // Acessos: o gestor escolhe, da equipa do software, quem usa o suporte (S14, S18).
            if (caminho === "acessos") {
                if (!gestor)
                    throw new Falha(403, "sem_permissao", "Só quem gere o software escolhe os acessos ao suporte.");
                if (!config.equipa)
                    throw new Falha(501, "equipa_por_configurar", "Falta indicar a equipa do software (opção `equipa`).");
                const equipa = await config.equipa();
                if (metodo === "GET") {
                    const escolhas = new Map((await armazem.liberados()).map((l) => [l.id, l]));
                    return json({
                        equipa: equipa.map((p) => ({ ...p, liberado: escolhas.has(p.id), drive: escolhas.get(p.id)?.drive ?? false, credenciais: escolhas.get(p.id)?.credenciais ?? false })),
                    });
                }
                if (metodo === "PUT") {
                    // { acessos: [{ id, drive, credenciais }] }; `{ ids }` (versões anteriores) dá a Drive a todos.
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
                        ...new Map(lista
                            .filter((a) => daEquipa.has(a.id))
                            .map((a) => [a.id, { id: a.id, drive: a.drive !== false, credenciais: a.credenciais === true }])).values(),
                    ];
                    // Primeiro a plataforma: se falhar, nada muda aqui.
                    await plataforma("PUT", "/liberados", {
                        utilizadores: escolhidos.map((a) => {
                            const p = daEquipa.get(a.id);
                            return { id: p.id, nome: p.nome ?? null, email: p.email ?? null, fotoUrl: p.fotoUrl ?? null, drive: a.drive, credenciais: a.credenciais };
                        }),
                    });
                    await armazem.definirLiberados(escolhidos);
                    return json({ liberados: escolhidos.length, comDrive: escolhidos.filter((a) => a.drive).length, comCredenciais: escolhidos.filter((a) => a.credenciais).length });
                }
            }
            // As conversas com a Mube (v0.6.0): não pedem o suporte, só estar na equipa (D3).
            const segmentos = caminho.split("/");
            if (segmentos[0] === "conversas" || segmentos[0] === "equipa-mube")
                return await rotaDeConversas(request, metodo, segmentos, quem);
            const utilizador = { id: quem.id, nome: quem.nome ?? null, email: quem.email ?? null, fotoUrl: quem.fotoUrl ?? null };
            const corpo = async () => ({ ...(await request.json().catch(() => ({}))), utilizador });
            // v0.7.0, `relatosAbertos`: quem não está liberado também reporta (e envia
            // os ficheiros do relato). Antes do portão; tudo o resto continua fechado.
            if (!liberado && config.relatosAbertos && metodo === "POST") {
                if (caminho === "relatos")
                    return await relatar(await corpo(), false);
                // Sem acesso aos tickets, o único envio possível é o de um relato.
                if (caminho === "ficheiros")
                    return json(await enviarFicheiro(request, utilizador, "relato"), 201);
            }
            if (!liberado)
                throw new Falha(403, "nao_liberado", "Não tem acesso ao suporte deste projeto.");
            const partes = caminho.split("/");
            // Tickets: lidos da cópia; o detalhe tenta a plataforma primeiro.
            if (metodo === "GET" && caminho === "tickets") {
                if (!(await armazem.sincronizado()))
                    await sincronizar().catch(() => undefined);
                const [tickets, avisos] = await Promise.all([armazem.tickets(), armazem.notificacoes(quem.id, 300)]);
                const paraEle = filtroDosAvisos(tickets, quem.id, gestor);
                const porLer = new Set(avisos.filter((n) => !n.lida && n.ticket_numero && paraEle(n)).map((n) => n.ticket_numero));
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
            if (metodo === "POST" && caminho === "relatos")
                return await relatar(await corpo(), true);
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
            // Credenciais (S63): só para quem as tem; seguem para a plataforma, com o utilizador da sessão. Nunca se guardam aqui, nem os valores.
            if (partes[0] === "credenciais") {
                if (!credenciais)
                    throw new Falha(403, "sem_credenciais", "Não tem acesso às credenciais deste projeto.");
                if (metodo === "GET" && partes.length === 1)
                    return json(await plataforma("GET", "/credenciais"));
                if (metodo === "POST" && partes.length === 1)
                    return json(await plataforma("POST", "/credenciais", await corpo()), 201);
                if (["PUT", "DELETE"].includes(metodo) && partes.length === 2)
                    return json(await plataforma(metodo, `/${caminho}`, await corpo()));
                // Ver o que se enviou: decifrado na plataforma, a pedido, e registado.
                if (metodo === "POST" && partes.length === 3 && partes[2] === "revelar")
                    return json(await plataforma("POST", `/${caminho}`, await corpo()));
            }
            // Notificações: só na cópia. Os pedidos de credenciais só a quem as vê;
            // os avisos de um ticket só a quem tem a ver com ele (e ao gestor).
            if (metodo === "GET" && caminho === "notificacoes") {
                const [tickets, todos] = await Promise.all([armazem.tickets(), armazem.notificacoes(quem.id, 400)]);
                const paraEle = filtroDosAvisos(tickets, quem.id, gestor);
                const avisos = todos.filter((n) => (credenciais || n.tipo !== "credencial") && paraEle(n)).slice(0, 100);
                return json({ notificacoes: avisos.map((n) => paraQuem(n, quem.id)) });
            }
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
    /**
     * O relato (um erro ou, desde a 0.7, uma sugestão). A cópia guarda sempre o
     * ticket; o aviso "recebido" só a quem o pode ler (um liberado).
     */
    async function relatar(pedido, liberado) {
        const r = await plataforma("POST", "/relatos", pedido);
        await armazem.guardarTickets([semUrls(r.ticket)]);
        if (!r.repetido && liberado) {
            const sugestao = r.ticket.tipo === "sugestao";
            await armazem.guardarNotificacao({
                id: `recebido-${r.ticket.id}`,
                tipo: "recebido",
                ticket_numero: r.ticket.numero,
                titulo: sugestao ? "A sua sugestão foi recebida" : "O seu relato foi recebido",
                corpo: `${r.ticket.codigo} entrou na fila de triagem.`,
                criado_em: new Date().toISOString(),
            });
        }
        return json(r, 201);
    }
    async function enviarFicheiro(request, utilizador, finalidade) {
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
        const pedido = await plataforma("POST", "/ficheiros", { utilizador, nome, tipoMime, tamanhoBytes: tamanho, ...(finalidade ? { finalidade } : {}) });
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
/**
 * A equipa do software do cliente, para as conversas (D3): quem não vier sai
 * da equipa e deixa de ver as conversas. Com `conversas: true` o servidor já a
 * envia ao arrancar e de hora a hora; chamar isto quando a equipa muda.
 */
export async function sincronizarEquipaMube(pessoas, config = {}) {
    const url = (config.url ?? process.env.MUBE_URL ?? "").replace(/\/$/, "");
    const r = await fetch(`${url}/api/v1/equipa`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${config.chave ?? process.env.MUBE_CHAVE ?? ""}`,
            "X-Mube-Cliente": config.clienteId ?? process.env.MUBE_CLIENTE_ID ?? "",
            "X-Mube-Projeto": config.projetoId ?? process.env.MUBE_PROJETO_ID ?? "",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ utilizadores: pessoas.map((p) => ({ id: p.id, nome: p.nome ?? null, email: p.email ?? null, fotoUrl: p.fotoUrl ?? null })) }),
    });
    const dados = await r.json().catch(() => null);
    if (!r.ok)
        throw new Error(dados?.erro?.mensagem ?? `A plataforma respondeu ${r.status}.`);
    return dados;
}
/** O tipo que veio num evento, se for um dos conhecidos. */
function tipoDoTicket(valor) {
    return valor === "erro" || valor === "sugestao" ? valor : null;
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
/**
 * Quem vê cada aviso. Um aviso sem ticket (ex.: um pedido de credencial) é
 * para todos; o de um ticket, para quem o relatou, quem lá comentou do lado
 * do cliente e quem a equipa mencionou. O gestor dos acessos vê todos.
 * Os avisos de estados intermédios, guardados por versões anteriores, já não
 * contam (ver `notificacaoDoEvento`).
 */
function filtroDosAvisos(tickets, utilizadorId, gestor) {
    const interessados = new Map();
    for (const t of tickets) {
        const ids = new Set();
        if (t.relatado_por?.id)
            ids.add(t.relatado_por.id);
        for (const r of t.relatos ?? [])
            if (r.utilizador?.id)
                ids.add(r.utilizador.id);
        for (const c of t.comentarios ?? [])
            if (c.autor.tipo === "cliente")
                ids.add(c.autor.id);
        interessados.set(t.numero, ids);
    }
    return (n) => {
        if (n.tipo === "estado" && n.titulo === "Estado atualizado")
            return false;
        if (gestor || !n.ticket_numero || n.mencionados?.includes(utilizadorId))
            return true;
        // Um ticket que ainda não está na cópia: sem saber de quem é, mostra-se.
        return interessados.get(n.ticket_numero)?.has(utilizadorId) ?? true;
    };
}
/** O aviso como cada pessoa o vê: a resposta em que foi mencionada passa a menção. */
function paraQuem(n, utilizadorId) {
    if (n.tipo !== "comentario" || !n.mencionados?.includes(utilizadorId))
        return n;
    // O código (QRE-12) vem da plataforma e abre o corpo da resposta: "QRE-12: “…”".
    const codigo = n.ticket_numero ? (n.corpo?.match(/^([A-Z][A-Z0-9]{1,5}-\d+):/)?.[1] ?? `#${n.ticket_numero}`) : null;
    return { ...n, tipo: "mencao", titulo: codigo ? `Menção da equipa em ${codigo}` : "Menção da equipa" };
}
/**
 * S19: o que o evento vira na central de notificações do componente. Nunca há
 * aviso interno, nem dos estados intermédios (Triagem, Contenção, Correção,
 * Em Validação): o cliente só é avisado do que lhe pede algo ou fecha o ticket.
 */
function notificacaoDoEvento(evento) {
    // Um aviso sem ticket (ex.: a equipa pediu uma credencial, S63).
    if (evento.tipo === "notificacao") {
        const n = evento.dados.notificacao;
        if (!n?.titulo)
            return null;
        const tipo = n.tipo === "credencial" ? "credencial" : "aviso";
        return { id: evento.id, tipo, ticket_numero: null, titulo: n.titulo.slice(0, 200), corpo: n.corpo?.slice(0, 500) ?? null, criado_em: evento.ocorrido_em };
    }
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
        return null;
    }
    if (evento.tipo === "comentario_externo") {
        const c = evento.dados.comentario;
        // S74.13: o excerto sem as marcas do Markdown.
        const texto = textoDoMarkdown(c?.corpo, 120);
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
