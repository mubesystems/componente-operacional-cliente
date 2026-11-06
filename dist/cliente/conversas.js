"use client";
/**
 * As conversas com a Mube no chat do software do cliente (v0.6.0; change
 * `conversas-com-clientes`, D9). Só hooks, sem ecrã: cada software desenha as
 * conversas no seu chat (os membros da Mube no fim da lista da equipa; o grupo
 * geral e as TaskForces nos grupos).
 *
 * Um motor por `base`, partilhado por todos os hooks da página (como o dos
 * avisos, S61): uma leitura da lista de cada vez e um só relógio. Sem sinal de
 * tempo real, volta a ler de 15 em 15 segundos e ao voltar ao separador; com
 * ele, o software chama `recarregarConversasMube()` (D8).
 *
 * v0.7.0: o contador do menu (`useNaoLidosMube`), que se monta em todas as
 * páginas, já não lê a lista da plataforma. Conta na cópia do servidor do
 * software (`GET conversas/por-ler`, mantida pelo webhook), de minuto a minuto,
 * ao voltar à janela e com o sinal de tempo real. Só a lista e a conversa
 * aberta (`useConversasMube`, `useMensagensMube`) falam com a plataforma; com
 * elas montadas, o contador segue a lista e não pergunta nada.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { criarApi, ErroDoSuporte } from "./api.js";
const A_CADA_MS = 15_000;
/** O contador do menu (v0.7.0): da cópia do servidor, de minuto a minuto. */
const CONTADOR_A_CADA_MS = 60_000;
/** Os membros da Mube mudam pouco: de 5 em 5 minutos chega. */
const MEMBROS_A_CADA_MS = 5 * 60_000;
const EVENTO = "mube:conversas";
const POR_PAGINA = 50;
/** Os códigos que dizem que as conversas não estão ligadas neste software (ou nesta sessão). */
const DESLIGADAS = new Set(["rota_inexistente", "conversas_desligadas", "sem_sessao", "armazem_sem_conversas", "fora_da_equipa"]);
const LISTA_INICIAL = { ativo: null, conversas: [], membros: [], conversaIndividual: false, defasado: false, erro: null, aCarregar: true };
const CONVERSA_INICIAL = { conversa: null, mensagens: [], seguinte: null, defasado: false, erro: null, aCarregar: true };
const CONTADOR_INICIAL = { ativo: null, naoLidos: 0 };
const motores = new Map();
function motorDe(base) {
    const existente = motores.get(base);
    if (existente)
        return existente;
    const m = {
        api: criarApi(base),
        estado: LISTA_INICIAL,
        ouvintes: new Set(),
        montados: 0,
        pedido: null,
        membrosEm: 0,
        relogio: null,
        fios: new Map(),
        contador: { estado: CONTADOR_INICIAL, montados: 0, pedido: null, relogio: null },
    };
    motores.set(base, m);
    return m;
}
function mudarLista(m, parte) {
    m.estado = { ...m.estado, ...parte };
    // A lista é a fonte mais fresca: o contador do menu segue-a.
    if (m.estado.ativo !== null) {
        const naoLidos = m.estado.ativo ? m.estado.conversas.reduce((n, c) => n + porLerDe(c), 0) : 0;
        if (m.contador.estado.ativo !== m.estado.ativo || m.contador.estado.naoLidos !== naoLidos)
            m.contador.estado = { ativo: m.estado.ativo, naoLidos };
    }
    for (const o of m.ouvintes)
        o();
    acertarRelogio(m);
}
function mudarContador(m, estado) {
    const atual = m.contador.estado;
    if (atual.ativo !== estado.ativo || atual.naoLidos !== estado.naoLidos) {
        m.contador.estado = estado;
        for (const o of m.ouvintes)
            o();
    }
    acertarRelogioDoContador(m);
}
/** O número por ler, da cópia do servidor (nunca da plataforma, salvo se a cópia falhar lá). */
function recarregarContador(m) {
    const c = m.contador;
    // Com a lista montada, ela já lê (e alimenta o contador).
    if (m.montados > 0)
        return m.pedido ?? Promise.resolve();
    if (c.pedido)
        return c.pedido;
    c.pedido = m.api
        .porLerConversas()
        .then((r) => {
        // Se entretanto a lista montou, a dela é mais fresca.
        if (m.montados === 0)
            mudarContador(m, { ativo: true, naoLidos: r.naoLidos });
    })
        .catch((e) => {
        if (DESLIGADAS.has(codigoDoErro(e)))
            mudarContador(m, { ativo: false, naoLidos: 0 });
        // Outra falha (rede, servidor): fica o último número; tenta de novo na próxima volta.
    })
        .finally(() => {
        c.pedido = null;
    });
    return c.pedido;
}
function acertarRelogioDoContador(m) {
    const c = m.contador;
    const ligado = c.montados > 0 && m.montados === 0 && c.estado.ativo !== false;
    if (ligado && c.relogio == null)
        c.relogio = window.setInterval(() => void recarregarContador(m), CONTADOR_A_CADA_MS);
    if (!ligado && c.relogio != null) {
        window.clearInterval(c.relogio);
        c.relogio = null;
    }
}
function mudarFio(f, parte) {
    f.estado = { ...f.estado, ...parte };
    for (const o of f.ouvintes)
        o();
}
const mensagemDoErro = (e) => (e instanceof Error ? e.message : "Não foi possível ler as conversas.");
const codigoDoErro = (e) => (e instanceof ErroDoSuporte ? e.codigo : "");
function recarregarLista(m) {
    if (m.pedido)
        return m.pedido;
    const membros = Date.now() - m.membrosEm > MEMBROS_A_CADA_MS;
    m.pedido = Promise.all([m.api.conversas(), membros ? m.api.equipaMube().catch(() => null) : Promise.resolve(null)])
        .then(([lista, equipa]) => {
        if (equipa)
            m.membrosEm = Date.now();
        mudarLista(m, {
            ativo: true,
            conversas: lista.conversas,
            defasado: lista.defasado,
            erro: null,
            aCarregar: false,
            ...(equipa ? { membros: equipa.membros, conversaIndividual: equipa.conversaIndividual } : {}),
        });
        // A lista diz o que mudou: as conversas abertas leem de novo.
        for (const [id, f] of m.fios)
            if (f.montados > 0)
                void recarregarFio(m, id, f);
    })
        .catch((e) => {
        if (DESLIGADAS.has(codigoDoErro(e)))
            mudarLista(m, { ativo: false, conversas: [], membros: [], aCarregar: false, erro: null });
        else
            mudarLista(m, { erro: mensagemDoErro(e), aCarregar: false });
    })
        .finally(() => {
        m.pedido = null;
    });
    return m.pedido;
}
/** A página mais recente; as anteriores já lidas ficam. */
function recarregarFio(m, conversaId, f) {
    if (f.pedido)
        return f.pedido;
    f.pedido = m.api
        .mensagens(conversaId)
        .then((r) => {
        const maisAntiga = r.mensagens[0]?.criada_em;
        const anteriores = maisAntiga ? f.estado.mensagens.filter((x) => x.criada_em < maisAntiga) : [];
        // Só a primeira página diz onde continuar; com anteriores já lidas, fica a delas.
        const seguinte = anteriores.length ? f.estado.seguinte : r.seguinte;
        mudarFio(f, { conversa: r.conversa, mensagens: [...anteriores, ...r.mensagens], seguinte, defasado: r.defasado, erro: null, aCarregar: false });
    })
        .catch((e) => mudarFio(f, { erro: mensagemDoErro(e), aCarregar: false }))
        .finally(() => {
        f.pedido = null;
    });
    return f.pedido;
}
function acertarRelogio(m) {
    const ligado = m.montados > 0 && m.estado.ativo !== false;
    if (ligado && m.relogio == null)
        m.relogio = window.setInterval(() => void recarregarLista(m), A_CADA_MS);
    if (!ligado && m.relogio != null) {
        window.clearInterval(m.relogio);
        m.relogio = null;
    }
}
let ouvintesGlobais = false;
function ligarOuvintesGlobais() {
    if (ouvintesGlobais || typeof window === "undefined")
        return;
    ouvintesGlobais = true;
    // Ao voltar ao separador (também tenta de novo quando as conversas estavam desligadas).
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible")
            return;
        for (const m of motores.values()) {
            if (m.montados > 0)
                void recarregarLista(m);
            else if (m.contador.montados > 0)
                void recarregarContador(m);
        }
    });
    // O contador também ao voltar à janela (o separador pode ter estado sempre visível).
    window.addEventListener("focus", () => {
        for (const m of motores.values())
            if (m.montados === 0 && m.contador.montados > 0)
                void recarregarContador(m);
    });
    // O sinal de tempo real do software (D8): ler já, sem esperar pelos 15 segundos.
    window.addEventListener(EVENTO, (e) => {
        const { base, conversaId } = (e.detail ?? {});
        for (const [b, m] of motores) {
            if (base && base !== b)
                continue;
            if (m.montados > 0)
                void recarregarLista(m);
            else if (m.contador.montados > 0)
                void recarregarContador(m);
            const f = conversaId ? m.fios.get(conversaId) : undefined;
            if (f && f.montados > 0)
                void recarregarFio(m, conversaId, f);
        }
    });
}
/**
 * Para o software chamar quando recebe o seu sinal de tempo real (o que ele
 * emitiu em `aoMudarConversas`): as conversas e, se indicada, essa conversa
 * voltam a ler já.
 */
export function recarregarConversasMube(conversaId, base) {
    if (typeof window === "undefined")
        return;
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { conversaId, base } }));
}
// Quem está montado conta para o relógio (fora dos hooks: o motor vive fora do React).
function montar(m) {
    m.montados += 1;
    acertarRelogio(m);
    acertarRelogioDoContador(m);
    if (m.estado.aCarregar || m.montados === 1)
        void recarregarLista(m);
}
function desmontar(m) {
    m.montados -= 1;
    acertarRelogio(m);
    // Saiu a lista (ex.: da página do chat para outra): o contador volta a contar sozinho.
    acertarRelogioDoContador(m);
}
function montarContador(m) {
    m.contador.montados += 1;
    acertarRelogioDoContador(m);
    if (m.contador.montados === 1 || m.contador.estado.ativo === null)
        void recarregarContador(m);
}
function desmontarContador(m) {
    m.contador.montados -= 1;
    acertarRelogioDoContador(m);
}
function abrirFio(m, conversaId, f) {
    f.montados += 1;
    void recarregarFio(m, conversaId, f);
}
function fecharFio(f) {
    f.montados -= 1;
}
function useMotorDeConversas(base) {
    const m = useMemo(() => motorDe(base), [base]);
    const subscrever = useCallback((avisar) => {
        m.ouvintes.add(avisar);
        return () => {
            m.ouvintes.delete(avisar);
        };
    }, [m]);
    const estado = useSyncExternalStore(subscrever, () => m.estado, () => LISTA_INICIAL);
    useEffect(() => {
        ligarOuvintesGlobais();
        montar(m);
        return () => desmontar(m);
    }, [m]);
    return { m, estado };
}
const porLerDe = (c) => c.por_ler ?? 0;
/**
 * As conversas da pessoa da sessão com a Mube (D7: só as que ela vê) e os
 * membros da Mube do projeto (só para quem pode ter conversa individual).
 *
 * - `grupos`: o geral e as TaskForces, para a lista de grupos do chat;
 * - `individuais`: as conversas individuais já abertas;
 * - `membrosMube`: para o fim da lista da equipa; tocar num abre a individual (`abrirIndividual`).
 */
export function useConversasMube({ base = "/api/mube" } = {}) {
    const { m, estado } = useMotorDeConversas(base);
    const abrirIndividual = useCallback(async (pessoaId) => {
        const r = await m.api.abrirIndividual(pessoaId);
        void recarregarLista(m);
        return r.conversa;
    }, [m]);
    const recarregar = useCallback(() => recarregarLista(m), [m]);
    return useMemo(() => ({
        ativo: estado.ativo,
        aCarregar: estado.aCarregar,
        erro: estado.erro,
        defasado: estado.defasado,
        conversas: estado.conversas,
        grupos: estado.conversas.filter((c) => c.tipo !== "individual"),
        individuais: estado.conversas.filter((c) => c.tipo === "individual"),
        membrosMube: estado.membros,
        /** A pessoa pode ter conversa individual com a Mube (a Mube marcou-a). */
        conversaIndividual: estado.conversaIndividual,
        /** A individual já aberta com este membro da Mube, se houver. */
        individualCom: (pessoaId) => estado.conversas.find((c) => c.tipo === "individual" && c.pessoa_mube?.id === pessoaId) ?? null,
        naoLidos: estado.conversas.reduce((n, c) => n + porLerDe(c), 0),
        abrirIndividual,
        recarregar,
    }), [estado, abrirIndividual, recarregar]);
}
/**
 * O número de mensagens por ler nas conversas com a Mube, para o menu do
 * software. Desde a 0.7.0 conta na cópia do servidor do software (sem ir à
 * plataforma), de minuto a minuto, ao voltar à janela e com
 * `recarregarConversasMube()`; precisa do webhook configurado (§3.7 do GUIA).
 */
export function useNaoLidosMube({ base = "/api/mube" } = {}) {
    const m = useMemo(() => motorDe(base), [base]);
    const subscrever = useCallback((avisar) => {
        m.ouvintes.add(avisar);
        return () => {
            m.ouvintes.delete(avisar);
        };
    }, [m]);
    const estado = useSyncExternalStore(subscrever, () => m.contador.estado, () => CONTADOR_INICIAL);
    useEffect(() => {
        ligarOuvintesGlobais();
        montarContador(m);
        return () => desmontarContador(m);
    }, [m]);
    return { ativo: estado.ativo, naoLidos: estado.naoLidos };
}
/**
 * Uma conversa aberta: as mensagens (da mais antiga para a mais recente),
 * enviar, editar e apagar as próprias, marcar como lida e as anteriores.
 * `conversaId` nulo: nada aberto.
 */
export function useMensagensMube(conversaId, { base = "/api/mube" } = {}) {
    const { m } = useMotorDeConversas(base);
    const fio = useMemo(() => {
        if (!conversaId)
            return null;
        let f = m.fios.get(conversaId);
        if (!f) {
            f = { estado: CONVERSA_INICIAL, ouvintes: new Set(), montados: 0, pedido: null };
            m.fios.set(conversaId, f);
        }
        return f;
    }, [m, conversaId]);
    const subscrever = useCallback((avisar) => {
        if (!fio)
            return () => { };
        fio.ouvintes.add(avisar);
        return () => {
            fio.ouvintes.delete(avisar);
        };
    }, [fio]);
    const estado = useSyncExternalStore(subscrever, () => fio?.estado ?? CONVERSA_INICIAL, () => CONVERSA_INICIAL);
    useEffect(() => {
        if (!fio || !conversaId)
            return;
        abrirFio(m, conversaId, fio);
        return () => fecharFio(fio);
    }, [m, fio, conversaId]);
    const carregarAnteriores = useCallback(async () => {
        if (!fio || !conversaId || !fio.estado.seguinte)
            return;
        const r = await m.api.mensagens(conversaId, fio.estado.seguinte);
        const ja = new Set(fio.estado.mensagens.map((x) => x.id));
        mudarFio(fio, { mensagens: [...r.mensagens.filter((x) => !ja.has(x.id)), ...fio.estado.mensagens], seguinte: r.seguinte });
    }, [m, fio, conversaId]);
    const enviar = useCallback(async (corpo, opcoes = {}) => {
        if (!fio || !conversaId)
            throw new ErroDoSuporte("Nenhuma conversa aberta.", "sem_conversa", 0);
        const { mensagem } = await m.api.escrever(conversaId, corpo, opcoes);
        if (!fio.estado.mensagens.some((x) => x.id === mensagem.id))
            mudarFio(fio, { mensagens: [...fio.estado.mensagens, mensagem] });
        void recarregarLista(m);
        return mensagem;
    }, [m, fio, conversaId]);
    /** Um ficheiro para juntar a uma mensagem: devolve o `id` para `enviar(…, { ficheiros })`. */
    const enviarFicheiro = useCallback((ficheiro, nome, aoProgresso, sinal) => m.api.enviarParaConversa(ficheiro, nome, aoProgresso, sinal), [m]);
    const editar = useCallback(async (mensagemId, corpo) => {
        if (!fio || !conversaId)
            return;
        await m.api.editarMensagem(conversaId, mensagemId, corpo);
        mudarFio(fio, { mensagens: fio.estado.mensagens.map((x) => (x.id === mensagemId ? { ...x, corpo, editada: true } : x)) });
    }, [m, fio, conversaId]);
    const apagar = useCallback(async (mensagemId) => {
        if (!fio || !conversaId)
            return;
        await m.api.apagarMensagem(conversaId, mensagemId);
        mudarFio(fio, { mensagens: fio.estado.mensagens.map((x) => (x.id === mensagemId ? { ...x, corpo: null, apagada: true, anexos: [], reacoes: [] } : x)) });
    }, [m, fio, conversaId]);
    /** Leu até à última mensagem: o contador desta conversa passa a zero. */
    const marcarLida = useCallback(async () => {
        if (!fio || !conversaId)
            return;
        const ultima = fio.estado.mensagens.at(-1)?.criada_em;
        const lista = m.estado.conversas;
        if (lista.some((c) => c.id === conversaId && porLerDe(c) > 0))
            mudarLista(m, { conversas: lista.map((c) => (c.id === conversaId ? { ...c, por_ler: 0 } : c)) });
        await m.api.marcarConversaLida(conversaId, ultima).catch(() => undefined);
    }, [m, fio, conversaId]);
    return {
        conversa: estado.conversa,
        mensagens: estado.mensagens,
        aCarregar: estado.aCarregar,
        erro: estado.erro,
        defasado: estado.defasado,
        haMais: Boolean(estado.seguinte),
        porPagina: POR_PAGINA,
        carregarAnteriores,
        enviar,
        enviarFicheiro,
        editar,
        apagar,
        marcarLida,
    };
}
