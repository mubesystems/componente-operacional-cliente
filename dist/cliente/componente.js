"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Acessos } from "./acessos.js";
import { criarApi } from "./api.js";
import { Credenciais } from "./credenciais.js";
import { Drive } from "./drive.js";
import { Notificacoes } from "./notificacoes.js";
import { NovoRelato } from "./relato.js";
import { Sugestoes } from "./sugestoes.js";
import { Tickets } from "./tickets.js";
import { BannerDoTour, Tour } from "./tour.js";
import { Botao, BotaoIcone, Camada, Icone, Janela, Vazio } from "./ui.js";
const SEPARADORES = ["tickets", "sugestoes", "drive", "credenciais", "notificacoes", "acessos"];
/** v0.7.0: pode reportar (quem está liberado ou, com `relatosAbertos`, qualquer pessoa com sessão). */
export const podeRelatar = (s) => Boolean(s?.utilizador && (s.relatar ?? s.liberado));
const Ctx = createContext(null);
export const useSuporte = () => {
    const c = useContext(Ctx);
    if (!c)
        throw new Error("Fora do componente da Mube");
    return c;
};
const A_CADA_MS = 30_000;
/** Avisa as outras peças da página (o aviso flutuante, o item do menu) de que os avisos mudaram. */
const EVENTO = "mube:avisos";
const SEM_SESSAO = { utilizador: null, liberado: false, drive: false, credenciais: false, gestor: false };
const motores = new Map();
function motorDe(base) {
    const existente = motores.get(base);
    if (existente)
        return existente;
    const m = {
        api: criarApi(base),
        estado: { sessao: null, avisos: [], versao: 0 },
        ouvintes: new Set(),
        cadencias: new Map(),
        pedidoDeSessao: null,
        pedidoDeAvisos: null,
        relogio: null,
        eu: `motor:${base}`,
        porLerAgora: 0,
        recarregarAvisos: () => {
            // Um pedido de cada vez: quem chama durante um pedido recebe o mesmo resultado.
            if (m.pedidoDeAvisos)
                return;
            m.pedidoDeAvisos = m.api
                .notificacoes()
                .then((r) => {
                const antes = m.estado.avisos;
                // Um aviso novo: as listas abertas recarregam.
                const versao = r.notificacoes[0]?.id !== antes[0]?.id ? m.estado.versao + 1 : m.estado.versao;
                mudar(m, { avisos: r.notificacoes, versao });
                const porLer = r.notificacoes.filter((n) => !n.lida).length;
                m.porLerAgora = porLer;
                window.dispatchEvent(new CustomEvent(EVENTO, { detail: { fonte: m.eu, porLer } }));
            })
                .catch(() => undefined)
                .finally(() => {
                m.pedidoDeAvisos = null;
            });
        },
        recarregarSessao: () => {
            m.pedidoDeSessao = null;
            carregarSessao(m);
        },
    };
    motores.set(base, m);
    return m;
}
function mudar(m, parte) {
    m.estado = { ...m.estado, ...parte };
    for (const ouvir of m.ouvintes)
        ouvir();
    acertarRelogio(m);
}
function carregarSessao(m) {
    if (m.pedidoDeSessao)
        return;
    const pedido = m.api
        .sessao()
        .then((s) => {
        if (m.pedidoDeSessao !== pedido)
            return; // houve um recarregar entretanto
        mudar(m, { sessao: s });
        if (s.liberado)
            m.recarregarAvisos();
    })
        .catch(() => {
        if (m.pedidoDeSessao !== pedido)
            return;
        m.pedidoDeSessao = null; // falhou: a próxima peça a montar tenta de novo
        mudar(m, { sessao: SEM_SESSAO });
    });
    m.pedidoDeSessao = pedido;
}
// As novidades chegam à cópia por webhook; aqui só se volta a ler.
function acertarRelogio(m) {
    const cadencia = m.estado.sessao?.liberado && m.cadencias.size ? Math.min(...m.cadencias.values()) : null;
    if (m.relogio && m.relogio.cadencia === cadencia)
        return;
    if (m.relogio)
        window.clearInterval(m.relogio.id);
    m.relogio = cadencia == null ? null : { id: window.setInterval(m.recarregarAvisos, cadencia), cadencia };
}
// Um único par de ouvintes por página: voltar ao separador e os avisos de
// outros motores (outra `base`, ou uma versão antiga do componente).
let ouvintesGlobais = false;
function ligarOuvintesGlobais() {
    if (ouvintesGlobais || typeof window === "undefined")
        return;
    ouvintesGlobais = true;
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible")
            return;
        for (const m of motores.values())
            if (m.relogio)
                m.recarregarAvisos();
    });
    window.addEventListener(EVENTO, (e) => {
        const { fonte, porLer } = e.detail;
        for (const m of motores.values()) {
            if (m.relogio && fonte !== m.eu && porLer !== m.porLerAgora)
                m.recarregarAvisos();
        }
    });
}
const ESTADO_DO_SERVIDOR = { sessao: null, avisos: [], versao: 0 };
function useMotor(base, { ativo = true, cadencia = A_CADA_MS } = {}) {
    const m = useMemo(() => motorDe(base), [base]);
    const subscrever = useCallback((avisar) => {
        m.ouvintes.add(avisar);
        return () => {
            m.ouvintes.delete(avisar);
        };
    }, [m]);
    const estado = useSyncExternalStore(subscrever, () => m.estado, () => ESTADO_DO_SERVIDOR);
    useEffect(() => {
        ligarOuvintesGlobais();
        if (!m.estado.sessao || !m.pedidoDeSessao)
            carregarSessao(m);
    }, [m]);
    // Esta peça entra no relógio partilhado enquanto estiver ativa.
    const eu = useRef(Symbol("peça"));
    useEffect(() => {
        if (!ativo)
            return;
        const chave = eu.current;
        m.cadencias.set(chave, cadencia);
        acertarRelogio(m);
        return () => {
            m.cadencias.delete(chave);
            acertarRelogio(m);
        };
    }, [m, ativo, cadencia]);
    return {
        api: m.api,
        sessao: estado.sessao,
        avisos: estado.avisos,
        versao: estado.versao,
        recarregarAvisos: m.recarregarAvisos,
        recarregarSessao: m.recarregarSessao,
    };
}
function useNoNavegador() {
    return useSyncExternalStore(() => () => { }, () => true, () => false);
}
/** A secção e o ticket pedidos (`secao=notificacoes`, `ticket=12`), para os atalhos levarem ao sítio certo. */
function lerPedido(q) {
    const secao = q.get("secao");
    const ticket = Number(q.get("ticket"));
    const sugestao = Number(q.get("sugestao"));
    return {
        secao: secao && SEPARADORES.includes(secao) ? secao : null,
        ticket: Number.isInteger(ticket) && ticket > 0 ? ticket : null,
        sugestao: Number.isInteger(sugestao) && sugestao > 0 ? sugestao : null,
    };
}
function doEndereco() {
    if (typeof window === "undefined")
        return { secao: null, ticket: null, sugestao: null };
    return lerPedido(new URLSearchParams(window.location.search));
}
/**
 * v0.8.2: o `RelatarMube` leva à página do suporte. Com o `router.push` do Next,
 * a página pode já estar aberta, ou montar antes de o endereço mudar, por isso
 * o pedido também vem por aqui e não só pelo endereço.
 */
const EVENTO_IR = "mube:ir";
let pedidoPorAbrir = null;
// ─── A superfície: secções à esquerda (ou em baixo, no telemóvel) e o conteúdo ─
function Superficie({ motor, sessao, rotulo, modo, aoFechar, sugestoes = false, }) {
    // v0.7.0: quem não está liberado mas pode reportar (relatos abertos).
    const [relatoAberto, setRelatoAberto] = useState(false);
    const [inicio] = useState(doEndereco);
    const [separador, setSeparador] = useState(inicio.secao ?? "tickets");
    const [ticketAberto, setTicketAberto] = useState(inicio.ticket);
    const [sugestaoAberta, setSugestaoAberta] = useState(inicio.sugestao);
    const { avisos } = motor;
    useEffect(() => {
        const aplicar = (parametro) => {
            pedidoPorAbrir = null;
            const pedido = lerPedido(new URLSearchParams(parametro));
            if (pedido.secao)
                setSeparador(pedido.secao);
            if (pedido.ticket) {
                setSeparador("tickets");
                setTicketAberto(pedido.ticket);
            }
            if (pedido.sugestao) {
                setSeparador("sugestoes");
                setSugestaoAberta(pedido.sugestao);
            }
        };
        if (pedidoPorAbrir)
            aplicar(pedidoPorAbrir);
        const ouvir = (e) => aplicar(e.detail);
        window.addEventListener(EVENTO_IR, ouvir);
        return () => window.removeEventListener(EVENTO_IR, ouvir);
    }, []);
    // S65: o tour guiado. Feito ou dispensado fica no banco do software (nunca na plataforma).
    const [estadoDoTour, setEstadoDoTour] = useState(sessao.tour ?? null);
    const [emTour, setEmTour] = useState(false);
    const marcarTour = (estado) => {
        setEstadoDoTour(estado);
        void motor.api.marcarTour(estado).catch(() => undefined);
    };
    // Na janela, o Esc fecha (as janelas por cima apanham o Esc primeiro).
    useEffect(() => {
        if (modo !== "janela" || !aoFechar)
            return;
        const tecla = (e) => e.key === "Escape" && !ticketAberto && aoFechar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [modo, aoFechar, ticketAberto]);
    const porLer = avisos.filter((a) => !a.lida).length;
    // O gestor sem acesso ao suporte só vê os Acessos (pode dar acesso a si próprio).
    const separadores = [
        ...(sessao.liberado
            ? [
                { valor: "tickets", rotulo: "Tickets", icone: "Kanban" },
            ]
            : []),
        // v0.8.0: uma permissão à parte do suporte, escolhida em Acessos.
        ...(sessao.sugestoes ? [{ valor: "sugestoes", rotulo: "Sugestões", icone: "Ideia" }] : []),
        ...(sessao.liberado
            ? [
                // Sem acesso à Drive (escolha do gestor em Acessos), o separador não aparece.
                ...(sessao.drive ? [{ valor: "drive", rotulo: "Drive", icone: "Folder" }] : []),
                // S63: as credenciais, também por escolha do gestor.
                ...(sessao.credenciais
                    ? [{ valor: "credenciais", rotulo: "Credenciais", icone: "Key", n: avisos.filter((a) => !a.lida && a.tipo === "credencial").length }]
                    : []),
                { valor: "notificacoes", rotulo: "Notificações", icone: "Bell", n: porLer },
            ]
            : []),
        ...(sessao.gestor ? [{ valor: "acessos", rotulo: "Acessos", icone: "Users" }] : []),
    ];
    const principais = separadores.filter((s) => s.valor !== "acessos");
    const gestao = separadores.filter((s) => s.valor === "acessos");
    const atual = separadores.some((s) => s.valor === separador) ? separador : (separadores[0]?.valor ?? "tickets");
    const contexto = {
        api: motor.api,
        sessao,
        avisos,
        recarregarAvisos: motor.recarregarAvisos,
        recarregarSessao: motor.recarregarSessao,
        versao: motor.versao,
        ticketAberto,
        abrirTicket: (n) => {
            setSeparador("tickets");
            setTicketAberto(n);
        },
        fecharTicket: () => setTicketAberto(null),
        abrirSugestao: (n) => {
            setSeparador("sugestoes");
            setSugestaoAberta(n);
        },
        sugestaoAberta,
        fecharSugestao: () => setSugestaoAberta(null),
        abrirSeparador: (s) => {
            setTicketAberto(null);
            setSugestaoAberta(null);
            setSeparador(s);
        },
        sugestoes,
    };
    return (_jsxs(Ctx.Provider, { value: contexto, children: [_jsxs("aside", { className: "mube:hidden mube:w-60 mube:shrink-0 mube:flex-col mube:border-r mube:border-border mube:bg-background mube:md:flex", children: [_jsxs("div", { "data-mube-tour": "suporte", className: "mube:flex mube:h-14 mube:items-center mube:gap-2 mube:pr-2 mube:pl-4", children: [_jsx("span", { className: "mube:flex mube:size-7 mube:items-center mube:justify-center mube:rounded-lg mube:bg-primary mube:text-primary-foreground", children: _jsx(Icone, { nome: "Comment" }) }), _jsx("h1", { className: "mube:flex-1 mube:truncate mube:text-label-strong mube:text-foreground", children: rotulo }), aoFechar && _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar", onClick: aoFechar })] }), (sessao.liberado || sessao.gestor || sessao.sugestoes) && (_jsxs("nav", { "aria-label": "Sec\u00E7\u00F5es do suporte", className: "mube:flex mube:flex-1 mube:flex-col mube:gap-0.5 mube:px-2 mube:pt-2 mube:pb-3", children: [principais.map((s) => (_jsx(ItemLateral, { ...s, ativo: atual === s.valor, aoEscolher: () => contexto.abrirSeparador(s.valor) }, s.valor))), gestao.length > 0 && principais.length > 0 && _jsx("span", { "aria-hidden": true, className: "mube:mx-3 mube:my-2 mube:h-px mube:bg-border" }), gestao.map((s) => (_jsx(ItemLateral, { ...s, ativo: atual === s.valor, aoEscolher: () => contexto.abrirSeparador(s.valor) }, s.valor)))] })), (sessao.liberado || sessao.gestor) && estadoDoTour && (_jsx("div", { className: "mube:mt-auto mube:px-2 mube:pb-2", children: _jsxs("button", { type: "button", onClick: () => setEmTour(true), className: "mube:flex mube:h-9 mube:w-full mube:items-center mube:gap-2.5 mube:rounded-lg mube:px-3 mube:text-left mube:text-label-sm mube:text-muted-foreground mube:transition-colors mube:duration-150 mube:hover:bg-muted mube:hover:text-foreground mube:focus-visible:shadow-focus", children: [_jsx(Icone, { nome: "Play" }), "Rever o tour"] }) }))] }), _jsxs("div", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsxs("header", { className: "mube:flex mube:h-14 mube:shrink-0 mube:items-center mube:gap-2 mube:border-b mube:border-border mube:pr-3 mube:pl-4 mube:md:hidden", children: [_jsx("h1", { "data-mube-tour": "suporte", className: "mube:flex-1 mube:text-h4 mube:text-foreground", children: rotulo }), estadoDoTour && (sessao.liberado || sessao.gestor) && _jsx(BotaoIcone, { icone: "Play", rotulo: "Rever o tour", onClick: () => setEmTour(true) }), aoFechar && _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar", onClick: aoFechar })] }), !sessao.liberado && !sessao.gestor && !sessao.sugestoes ? (podeRelatar(sessao) ? (_jsxs(_Fragment, { children: [_jsx(Vazio, { icone: "Inbox", titulo: sugestoes ? "Reportar um problema ou dar uma sugestão" : "Reportar um problema", texto: "A equipa da Mube recebe o que enviar. Para acompanhar os pedidos aqui, pe\u00E7a acesso a quem gere o software na sua empresa.", acao: _jsx(Botao, { onClick: () => setRelatoAberto(true), children: sugestoes ? "Novo relato ou sugestão" : "Reportar um problema" }) }), relatoAberto && _jsx(NovoRelato, { aoFechar: () => setRelatoAberto(false), aoCriar: () => undefined })] })) : (_jsx(Vazio, { icone: "Inbox", titulo: "Sem acesso ao suporte deste projeto", texto: "Pe\u00E7a a quem gere o software na sua empresa para lhe dar acesso. Depois disso, pode reportar problemas e acompanhar os pedidos aqui." }))) : (_jsxs(_Fragment, { children: [_jsxs("main", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col", children: [atual === "tickets" && _jsx(Tickets, {}), atual === "sugestoes" && _jsx(Sugestoes, {}), atual === "drive" && _jsx(Drive, {}), atual === "credenciais" && _jsx(Credenciais, {}), atual === "notificacoes" && _jsx(Notificacoes, {}), atual === "acessos" && _jsx(Acessos, {})] }), separadores.length > 1 && (_jsx("nav", { "aria-label": "Sec\u00E7\u00F5es do suporte", className: "mube:flex mube:shrink-0 mube:border-t mube:border-border mube:bg-card mube:md:hidden", children: separadores.map((s) => {
                                    const ativo = atual === s.valor;
                                    return (_jsxs("button", { type: "button", "data-mube-tour": s.valor, "aria-current": ativo ? "page" : undefined, onClick: () => contexto.abrirSeparador(s.valor), className: `mube:relative mube:flex mube:h-14 mube:flex-1 mube:flex-col mube:items-center mube:justify-center mube:gap-1 mube:text-label-sm mube:transition-colors ${ativo ? "mube:text-foreground" : "mube:text-muted-foreground"}`, children: [_jsx(Icone, { nome: s.icone, tamanho: 18 }), s.rotulo, s.n ? _jsx("span", { className: "mube:absolute mube:top-2 mube:left-[calc(50%+6px)] mube:size-2 mube:rounded-full mube:bg-primary" }) : null] }, s.valor));
                                }) }))] }))] }), !estadoDoTour && !emTour && (sessao.liberado || sessao.gestor) && (_jsx(Camada, { children: _jsx(BannerDoTour, { aoComecar: () => setEmTour(true), aoDispensar: () => marcarTour("dispensado") }) })), emTour && (_jsx(Camada, { children: _jsx(Tour, { secoes: ["suporte", ...separadores.map((s) => s.valor)], aoSair: () => setEmTour(false), aoConcluir: () => {
                        setEmTour(false);
                        marcarTour("concluido");
                    } }) }))] }));
}
// ─── A página (a forma recomendada) ──────────────────────────────────────────
/**
 * O suporte da Mube como uma página do software do cliente (Figma: Embed 5.1
 * a 5.6): Tickets, Drive, Credenciais, Notificações e Acessos. Põe-se numa
 * rota própria (ex.: `app/(painel)/suporte/page.tsx`) e ocupa o espaço que o
 * layout lhe der. O atalho vive no menu do software (`useNovidadesMube`) e o
 * aviso flutuante só aparece com novidades (`AvisoMube`).
 *
 * Aceita `?secao=notificacoes` (ou tickets, drive, credenciais, acessos) e
 * `?ticket=12` no endereço, para os atalhos levarem ao sítio certo.
 *
 * Por omissão ocupa a área de conteúdo toda, sem moldura (o menu do software
 * fica ao lado), com o espaço da barra do iPhone reservado em baixo.
 */
export function PaginaMube({ base = "/api/mube", rotulo = "Suporte", tema = "auto", moldura = false, className = "", sugestoes = false, }) {
    const motor = useMotor(base);
    const escuro = useEscuro(tema);
    const noNavegador = useNoNavegador();
    const sessao = motor.sessao;
    return (_jsx("div", { className: `mube-c ${escuro ? "mube-escuro" : ""} ${className}`, style: { colorScheme: escuro ? "dark" : "light", height: className ? undefined : "100%" }, children: _jsx("div", { className: `mube:flex mube:h-full mube:w-full mube:overflow-hidden mube:bg-card mube:animar-aparecer ${moldura ? "mube:min-h-[640px] mube:rounded-[20px] mube:border mube:border-border" : "mube:min-h-[480px] mube:pb-[env(safe-area-inset-bottom)]"}`, children: !noNavegador || !sessao ? (_jsx("div", { "aria-busy": "true", className: "mube:flex mube:flex-1 mube:items-center mube:justify-center", children: _jsx("span", { className: "mube:size-5 mube:animate-spin mube:rounded-full mube:border-2 mube:border-muted-foreground mube:border-t-transparent" }) })) : !sessao.utilizador ? (_jsx(Vazio, { icone: "Inbox", titulo: "Entre no software para usar o suporte" })) : (_jsx(Superficie, { motor: motor, sessao: sessao, rotulo: rotulo, modo: "pagina", sugestoes: sugestoes })) }) }));
}
// ─── O atalho no menu e o aviso flutuante ────────────────────────────────────
/**
 * Para o item do menu do software: se a pessoa tem acesso ao suporte (para
 * mostrar o item) e quantas novidades por ler (para o número ao lado).
 *
 *   const { acesso, porLer } = useNovidadesMube()
 *   {acesso && <ItemDoMenu href="/suporte" rotulo="Suporte" contagem={porLer} />}
 */
export function useNovidadesMube({ base = "/api/mube" } = {}) {
    const { sessao, avisos } = useMotor(base, { cadencia: A_CADA_MS * 2 });
    return {
        /** Ainda a saber quem é. */
        aCarregar: !sessao,
        /** Liberado para o suporte ou gestor dos acessos: o item do menu aparece. */
        acesso: Boolean(sessao?.utilizador && (sessao.liberado || sessao.gestor)),
        porLer: avisos.filter((a) => !a.lida).length,
        /** O aviso mais recente por ler (para uma pista no menu, se quiser). */
        ultimo: avisos.find((a) => !a.lida) ?? null,
    };
}
/**
 * O número de novidades por ler, para pôr ao lado do item do menu. Não
 * aparece sem novidades nem a quem não tem acesso ao suporte.
 *
 *   <Link href="/suporte">Suporte <ContadorMube /></Link>
 *
 * Por omissão é a pílula do componente; com `className`, só o número, com o
 * estilo do software (ex.: `<ContadorMube className="ml-auto rounded-full bg-primary px-1.5 text-xs" />`).
 */
export function ContadorMube({ base = "/api/mube", className }) {
    const { acesso, porLer } = useNovidadesMube({ base });
    const noNavegador = useNoNavegador();
    const escuro = useEscuro("auto");
    if (!noNavegador || !acesso || !porLer)
        return null;
    const numero = porLer > 99 ? "99+" : porLer;
    const rotulo = porLer === 1 ? "1 novidade" : `${porLer} novidades`;
    if (className) {
        return (_jsx("span", { className: className, "aria-label": rotulo, children: numero }));
    }
    return (_jsx("span", { className: `mube-c ${escuro ? "mube-escuro" : ""}`, style: { display: "inline-flex" }, children: _jsx("span", { "aria-label": rotulo, className: "mube:flex mube:h-5 mube:min-w-5 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary mube:px-1.5 mube:text-label-sm mube:text-primary-foreground", children: numero }) }));
}
/**
 * Fechado pela pessoa: num cookie de sessão (sem validade), que vale para
 * todos os separadores e acaba quando o navegador fecha. No acesso seguinte,
 * o aviso volta a aparecer.
 */
const COOKIE_FECHADO = "mube_aviso_fechado";
const avisoFechado = () => typeof document !== "undefined" && document.cookie.split("; ").includes(`${COOKIE_FECHADO}=1`);
/**
 * O aviso flutuante: só aparece quando há novidades por ler (uma resposta da
 * equipa, uma mudança de estado, um pedido de aceite ou de credencial) e leva
 * à página do suporte, às Notificações. Não aparece na própria página, e o X
 * fecha-o até ao próximo acesso.
 */
export function AvisoMube({ base = "/api/mube", href = "/suporte", rotulo = "Suporte", tema = "auto", posicao = "direita", }) {
    const { porLer, ultimo } = useNovidadesMube({ base });
    const escuro = useEscuro(tema);
    const noNavegador = useNoNavegador();
    const caminho = useCaminho();
    const naPagina = caminho.replace(/\/$/, "") === href.split("?")[0].replace(/\/$/, "");
    const [fechado, setFechado] = useState(avisoFechado);
    if (!noNavegador || !porLer || naPagina || fechado)
        return null;
    const destino = `${href}${href.includes("?") ? "&" : "?"}secao=notificacoes`;
    const fechar = () => {
        document.cookie = `${COOKIE_FECHADO}=1; path=/; SameSite=Lax`;
        setFechado(true);
    };
    return createPortal(_jsx("div", { className: `mube-c ${escuro ? "mube-escuro" : ""}`, style: { colorScheme: escuro ? "dark" : "light" }, children: _jsxs("div", { "data-mube-aviso": "", style: { bottom: "var(--mube-aviso-baixo, 1.25rem)" }, className: `mube:fixed mube:z-[2147483000] mube:flex mube:max-w-[calc(100vw-2.5rem)] mube:items-center mube:gap-1 mube:rounded-full mube:bg-primary mube:py-1.5 mube:pr-1.5 mube:pl-1.5 mube:text-primary-foreground mube:shadow-soft-5 mube:transition-transform mube:duration-200 mube:animar-entrar mube:hover:-translate-y-0.5 ${posicao === "direita" ? "mube:right-5" : "mube:left-5"}`, children: [_jsxs("a", { href: destino, "aria-label": `${rotulo}: ${porLer === 1 ? "1 novidade" : `${porLer} novidades`}`, className: "mube:flex mube:min-w-0 mube:items-center mube:gap-3 mube:rounded-full mube:pr-1 mube:text-primary-foreground mube:no-underline mube:focus-visible:shadow-focus", children: [_jsxs("span", { className: "mube:relative mube:flex mube:size-8 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary-foreground/15", children: [_jsx(Icone, { nome: "Bell" }), _jsx("span", { "aria-hidden": true, className: "mube:absolute mube:top-0.5 mube:right-0.5 mube:size-2 mube:animate-ping mube:rounded-full mube:bg-primary-foreground/80" })] }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-col mube:leading-tight", children: [_jsx("span", { className: "mube:text-label", children: porLer === 1 ? "1 novidade no suporte" : `${porLer} novidades no suporte` }), ultimo && _jsx("span", { className: "mube:truncate mube:text-label-sm mube:opacity-75", children: ultimo.titulo })] }), _jsx("span", { className: "mube:flex mube:h-6 mube:min-w-6 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary-foreground mube:px-2 mube:text-label-sm mube:text-primary", children: porLer > 99 ? "99+" : porLer })] }), _jsx("button", { type: "button", onClick: fechar, "aria-label": "Fechar o aviso", title: "Fechar", className: "mube:flex mube:size-7 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:text-primary-foreground/70 mube:transition-colors mube:duration-150 mube:hover:bg-primary-foreground/15 mube:hover:text-primary-foreground mube:focus-visible:shadow-focus", children: _jsx(Icone, { nome: "X", tamanho: 14 }) })] }) }), document.body);
}
/** O caminho atual, também nas navegações do cliente (pushState) sem recarregar. */
function useCaminho() {
    return useSyncExternalStore((avisar) => {
        const id = window.setInterval(avisar, 500);
        window.addEventListener("popstate", avisar);
        return () => {
            window.clearInterval(id);
            window.removeEventListener("popstate", avisar);
        };
    }, () => window.location.pathname, () => "");
}
// ─── Reportar um problema a partir de qualquer página ────────────────────────
const EVENTO_RELATAR = "mube:relatar";
/** ⌥⇧R no Mac, Alt+Shift+R no Windows: não colide com os atalhos dos navegadores. */
const ATALHO_DO_RELATO = "alt+shift+r";
/** Quanto se espera pela sessão antes de dizer que o formulário não abre. */
const ESPERA_DA_SESSAO_MS = 3000;
/** Com uma janela modal do software aberta, o nosso formulário ficaria sem cliques nem foco. */
const softwareComJanela = () => document.body.style.pointerEvents === "none";
/** Vai junto com o relato, para a equipa saber onde a pessoa estava. Sem a query, que pode ter dados. */
function paginaAtual() {
    const { pathname } = window.location;
    return document.title ? `${document.title} (${pathname})` : pathname;
}
/**
 * Abre o "Reportar um problema" do `RelatarMube` montado na página. Para um
 * botão ou um item de menu do software:
 *
 *   <button onClick={() => abrirRelatoMube()}>Reportar um problema</button>
 *   <button onClick={() => abrirRelatoMube("sugestao")}>Sugerir uma ideia</button>
 *
 * Numa janela modal do software, fecha-a primeiro. v0.8.1: `"sugestao"` abre já em «Sugestão» (precisa de `sugestoes` no
 * `RelatarMube`). Qualquer outro valor, como o evento do clique, abre em «Erro».
 */
export function abrirRelatoMube(tipo) {
    if (typeof window === "undefined")
        return;
    window.dispatchEvent(new CustomEvent(EVENTO_RELATAR, { detail: { tipo: tipo === "sugestao" ? "sugestao" : "erro" } }));
}
function lerAtalho(texto) {
    const partes = texto.toLowerCase().split("+").map((p) => p.trim()).filter(Boolean);
    const tecla = partes.pop();
    if (!tecla)
        return null;
    return {
        tecla,
        alt: partes.some((p) => p === "alt" || p === "option" || p === "opt"),
        shift: partes.includes("shift"),
        mod: partes.some((p) => p === "mod" || p === "cmd" || p === "ctrl" || p === "meta"),
    };
}
function bate(c, e) {
    if (e.altKey !== c.alt || e.shiftKey !== c.shift || (e.metaKey || e.ctrlKey) !== c.mod)
        return false;
    // No Mac, o ⌥ muda a letra (⌥⇧R dá "‰"): as letras e os números comparam-se pela tecla física.
    if (/^[a-z]$/.test(c.tecla))
        return e.code === `Key${c.tecla.toUpperCase()}`;
    if (/^[0-9]$/.test(c.tecla))
        return e.code === `Digit${c.tecla}`;
    return e.key.toLowerCase() === c.tecla;
}
/**
 * O "Reportar um problema" em qualquer página do software, sem ir ao suporte:
 * monta-se uma vez no layout com sessão e abre por cima da página com o atalho
 * (por omissão ⌥⇧R / Alt+Shift+R) ou com `abrirRelatoMube()`. Ao enviar, a
 * pessoa fica onde estava: a confirmação mostra o código, e "Ver o ticket"
 * leva à página do suporte. Só abre a quem tem acesso ao suporte (ou, com
 * `relatosAbertos: true` no servidor, a qualquer pessoa com sessão); aos outros,
 * e se a sessão não responder, mostra um aviso. A página onde a pessoa estava
 * vai no fim do texto.
 * Com `sugestoes`, a pessoa escolhe entre «Erro» e «Sugestão».
 */
export function RelatarMube({ base = "/api/mube", href = "/suporte", atalho = ATALHO_DO_RELATO, tema = "auto", navegar, sugestoes = false, }) {
    const motor = useMotor(base, { ativo: false });
    const escuro = useEscuro(tema);
    const noNavegador = useNoNavegador();
    const [aberto, setAberto] = useState(false);
    const [pedido, setPedido] = useState(null);
    const [pagina, setPagina] = useState(undefined);
    const [semResposta, setSemResposta] = useState(false);
    const sessao = motor.sessao;
    const pode = podeRelatar(sessao);
    const { api, avisos, versao, recarregarAvisos, recarregarSessao } = motor;
    // v0.8.2: o botão responde sempre, mesmo antes de a sessão chegar.
    useEffect(() => {
        const abrir = (e) => {
            const tipo = e.detail?.tipo;
            // `vez` volta a montar o formulário, se já estava aberto no outro tipo.
            setPedido((p) => (tipo ? { tipo, vez: (p?.vez ?? 0) + 1 } : null));
            setPagina(paginaAtual());
            setAberto(true);
        };
        window.addEventListener(EVENTO_RELATAR, abrir);
        return () => window.removeEventListener(EVENTO_RELATAR, abrir);
    }, []);
    // Se a sessão falhou, o motor fica com `SEM_SESSAO`: sem utilizador, volta-se a tentar.
    const semSessao = aberto && !sessao?.utilizador;
    useEffect(() => {
        if (!semSessao) {
            setSemResposta(false);
            return;
        }
        recarregarSessao();
        const id = window.setTimeout(() => setSemResposta(true), ESPERA_DA_SESSAO_MS);
        return () => window.clearTimeout(id);
    }, [semSessao, recarregarSessao]);
    useEffect(() => {
        if (!pode)
            return;
        const combinacao = atalho ? lerAtalho(atalho) : null;
        const tecla = (e) => {
            if (!combinacao || e.repeat || !bate(combinacao, e) || softwareComJanela())
                return;
            e.preventDefault();
            setPedido(null);
            setPagina(paginaAtual());
            setAberto(true);
        };
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [pode, atalho]);
    const contexto = useMemo(() => {
        if (!sessao)
            return null;
        const ir = (parametro) => {
            const url = `${href}${href.includes("?") ? "&" : "?"}${parametro}`;
            pedidoPorAbrir = parametro;
            window.dispatchEvent(new CustomEvent(EVENTO_IR, { detail: parametro }));
            if (navegar)
                navegar(url);
            else
                window.location.assign(url);
        };
        return {
            api,
            sessao,
            avisos,
            recarregarAvisos,
            recarregarSessao,
            versao,
            ticketAberto: null,
            abrirTicket: (n) => ir(`ticket=${n}`),
            abrirSugestao: (n) => ir(`secao=sugestoes&sugestao=${n}`),
            sugestaoAberta: null,
            fecharSugestao: () => { },
            abrirSeparador: (s) => ir(`secao=${s}`),
            fecharTicket: () => { },
            sugestoes,
        };
    }, [api, sessao, avisos, versao, recarregarAvisos, recarregarSessao, href, navegar, sugestoes]);
    const fechar = useCallback(() => setAberto(false), []);
    if (!noNavegador || !aberto)
        return null;
    if (!pode || !contexto) {
        if (!sessao?.utilizador && !semResposta)
            return null;
        return (_jsx("div", { className: `mube-c ${escuro ? "mube-escuro" : ""}`, style: { display: "contents" }, children: _jsx(Janela, { titulo: "N\u00E3o foi poss\u00EDvel abrir", aoFechar: fechar, rodape: _jsx(Botao, { "data-principal": true, onClick: fechar, children: "Fechar" }), children: _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: sessao?.utilizador ? "A sua conta não tem acesso a este formulário. Fale com quem gere o software." : "Não conseguimos ligar ao suporte. Tente de novo daqui a pouco." }) }) }));
    }
    return (
    // Só dá a classe (e o tema) à janela, que abre por portal no fim da página.
    _jsx("div", { className: `mube-c ${escuro ? "mube-escuro" : ""}`, style: { display: "contents" }, children: _jsx(Ctx.Provider, { value: contexto, children: _jsx(NovoRelato, { tipoInicial: pedido?.tipo, pagina: pagina, aoFechar: fechar, aoCriar: () => sessao?.liberado && recarregarAvisos() }, pedido?.vez ?? 0) }) }));
}
// ─── A janela flutuante (a forma antiga) ─────────────────────────────────────
/**
 * O suporte numa janela por cima do software, aberta pelo botão "Suporte" no
 * canto. Continua a funcionar, mas a forma recomendada é a página
 * (`PaginaMube`) com o atalho no menu e o `AvisoMube`.
 */
export function ComponenteMube({ base = "/api/mube", rotulo = "Suporte", tema = "auto", posicao = "direita", sugestoes = false, }) {
    const [aberto, setAberto] = useState(false);
    const motor = useMotor(base, { cadencia: A_CADA_MS });
    const noNavegador = useNoNavegador();
    const escuro = useEscuro(tema);
    const sessao = motor.sessao;
    if (!noNavegador || !sessao?.utilizador)
        return null;
    const porLer = motor.avisos.filter((a) => !a.lida).length;
    return createPortal(_jsxs("div", { className: `mube-c ${escuro ? "mube-escuro" : ""}`, style: { colorScheme: escuro ? "dark" : "light" }, children: [!aberto && (_jsxs("button", { type: "button", onClick: () => setAberto(true), "aria-label": porLer ? `${rotulo}, ${porLer} novidades` : rotulo, className: `mube:fixed mube:bottom-5 mube:z-[2147483000] mube:flex mube:h-10 mube:items-center mube:gap-2 mube:rounded-full mube:bg-primary mube:pr-2 mube:pl-4 mube:text-label mube:text-primary-foreground mube:shadow-soft-5 mube:transition-transform mube:duration-200 mube:animar-entrar mube:hover:-translate-y-0.5 mube:focus-visible:shadow-focus ${posicao === "direita" ? "mube:right-5" : "mube:left-5"} ${porLer ? "" : "mube:pr-4"}`, children: [_jsx(Icone, { nome: "Comment" }), rotulo, porLer > 0 && (_jsx("span", { className: "mube:flex mube:h-5 mube:min-w-5 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary-foreground mube:px-1.5 mube:text-label-sm mube:text-primary", children: porLer > 99 ? "99+" : porLer }))] })), aberto && (_jsx("div", { role: "dialog", "aria-modal": "true", "aria-label": rotulo, className: "mube:fixed mube:inset-0 mube:z-[2147483001] mube:flex mube:bg-card mube:animar-entrar", children: _jsx(Superficie, { motor: motor, sessao: sessao, rotulo: rotulo, modo: "janela", aoFechar: () => setAberto(false), sugestoes: sugestoes }) }))] }), document.body);
}
/** Uma secção na barra lateral (Figma: Shell, item da barra; o ativo em pílula escura). */
function ItemLateral({ valor, rotulo, icone, n, ativo, aoEscolher }) {
    return (_jsxs("button", { type: "button", "data-mube-tour": valor, "aria-current": ativo ? "page" : undefined, onClick: aoEscolher, className: `mube:flex mube:h-9 mube:w-full mube:items-center mube:gap-2.5 mube:rounded-lg mube:px-3 mube:text-left mube:text-label mube:transition-colors mube:duration-150 mube:focus-visible:shadow-focus ${ativo ? "mube:bg-primary mube:text-primary-foreground" : "mube:text-foreground mube:hover:bg-muted"}`, children: [_jsx(Icone, { nome: icone }), _jsx("span", { className: "mube:flex-1 mube:truncate", children: rotulo }), n ? (_jsx("span", { className: `mube:min-w-5 mube:rounded-full mube:px-1.5 mube:text-center mube:text-label-sm ${ativo ? "mube:bg-primary-foreground mube:text-primary" : "mube:bg-muted mube:text-muted-foreground"}`, children: n })) : null] }));
}
/**
 * "auto": segue a página do software do cliente (a classe `dark`, o
 * `data-theme` ou o `color-scheme` do <html>), não o sistema: um componente
 * escuro numa página clara destoa.
 */
function useEscuro(tema) {
    return useSyncExternalStore((avisar) => {
        if (tema !== "auto")
            return () => { };
        const observador = new MutationObserver(avisar);
        observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
        return () => observador.disconnect();
    }, () => {
        if (tema !== "auto")
            return tema === "escuro";
        const html = document.documentElement;
        if (html.classList.contains("dark") || html.dataset.theme === "dark")
            return true;
        return getComputedStyle(html).colorScheme.trim() === "dark";
    }, () => false);
}
