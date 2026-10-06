"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Acessos } from "./acessos";
import { criarApi } from "./api";
import { Drive } from "./drive";
import { Notificacoes } from "./notificacoes";
import { Tickets } from "./tickets";
import { BotaoIcone, Icone, Vazio } from "./ui";
const Ctx = createContext(null);
export const useSuporte = () => {
    const c = useContext(Ctx);
    if (!c)
        throw new Error("Fora do ComponenteMube");
    return c;
};
const A_CADA_MS = 30_000;
/**
 * O componente da Mube no software do cliente (Figma: Embed 5.1 a 5.6).
 * Um botão "Suporte" no canto; abre o painel com Tickets, Drive e
 * Notificações. Identidade neutra (K2): só tokens neutros, sem marca.
 *
 * Fala só com a parte servidor do próprio software (`base`), nunca com a
 * plataforma: a chave do projeto não vem ao navegador.
 */
export function ComponenteMube({ base = "/api/mube", rotulo = "Suporte", tema = "auto", posicao = "direita", }) {
    const api = useMemo(() => criarApi(base), [base]);
    const noNavegador = useSyncExternalStore(() => () => { }, () => true, () => false);
    const escuro = useEscuro(tema);
    const [aberto, setAberto] = useState(false);
    const [separador, setSeparador] = useState("tickets");
    const [sessao, setSessao] = useState(null);
    const [avisos, setAvisos] = useState([]);
    const [versao, setVersao] = useState(0);
    const [ticketAberto, setTicketAberto] = useState(null);
    const recarregarAvisos = useCallback(() => {
        api
            .notificacoes()
            .then((r) => {
            setAvisos((antes) => {
                // Um aviso novo: as listas abertas recarregam.
                if (r.notificacoes[0]?.id !== antes[0]?.id)
                    setVersao((v) => v + 1);
                return r.notificacoes;
            });
        })
            .catch(() => undefined);
    }, [api]);
    const [pedidoDeSessao, setPedidoDeSessao] = useState(0);
    useEffect(() => {
        let ativo = true;
        api
            .sessao()
            .then((s) => {
            if (!ativo)
                return;
            setSessao(s);
            if (s.liberado)
                recarregarAvisos();
        })
            .catch(() => ativo && setSessao({ utilizador: null, liberado: false, drive: false, gestor: false }));
        return () => {
            ativo = false;
        };
    }, [api, recarregarAvisos, pedidoDeSessao]);
    // As novidades chegam à cópia por webhook; aqui só se volta a ler.
    useEffect(() => {
        if (!sessao?.liberado)
            return;
        const id = window.setInterval(recarregarAvisos, aberto ? A_CADA_MS : A_CADA_MS * 2);
        const aoVoltar = () => document.visibilityState === "visible" && recarregarAvisos();
        document.addEventListener("visibilitychange", aoVoltar);
        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", aoVoltar);
        };
    }, [sessao?.liberado, aberto, recarregarAvisos]);
    // Esc fecha o painel (as janelas por cima apanham o Esc primeiro).
    useEffect(() => {
        if (!aberto)
            return;
        const tecla = (e) => e.key === "Escape" && !ticketAberto && setAberto(false);
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [aberto, ticketAberto]);
    if (!noNavegador || !sessao?.utilizador)
        return null;
    const porLer = avisos.filter((a) => !a.lida).length;
    // O gestor sem acesso ao suporte só vê os Acessos (pode dar acesso a si próprio).
    const separadores = [
        ...(sessao.liberado
            ? [
                { valor: "tickets", rotulo: "Tickets", icone: "Kanban" },
                // Sem acesso à Drive (escolha do gestor em Acessos), o separador não aparece.
                ...(sessao.drive ? [{ valor: "drive", rotulo: "Drive", icone: "Folder" }] : []),
                { valor: "notificacoes", rotulo: "Notificações", icone: "Bell", n: porLer },
            ]
            : []),
        ...(sessao.gestor ? [{ valor: "acessos", rotulo: "Acessos", icone: "Users" }] : []),
    ];
    const principais = separadores.filter((s) => s.valor !== "acessos");
    const gestao = separadores.filter((s) => s.valor === "acessos");
    const atual = separadores.some((s) => s.valor === separador) ? separador : (separadores[0]?.valor ?? "tickets");
    const contexto = {
        api,
        sessao,
        avisos,
        recarregarAvisos,
        recarregarSessao: () => setPedidoDeSessao((n) => n + 1),
        versao,
        ticketAberto,
        abrirTicket: (n) => {
            setSeparador("tickets");
            setTicketAberto(n);
            setAberto(true);
        },
        fecharTicket: () => setTicketAberto(null),
    };
    return createPortal(_jsx(Ctx.Provider, { value: contexto, children: _jsxs("div", { className: `mube-c ${escuro ? "mube-escuro" : ""}`, style: { colorScheme: escuro ? "dark" : "light" }, children: [!aberto && (_jsxs("button", { type: "button", onClick: () => setAberto(true), "aria-label": porLer ? `${rotulo}, ${porLer} novidades` : rotulo, className: `mube:fixed mube:bottom-5 mube:z-[2147483000] mube:flex mube:h-10 mube:items-center mube:gap-2 mube:rounded-full mube:bg-primary mube:pr-2 mube:pl-4 mube:text-label mube:text-primary-foreground mube:shadow-soft-5 mube:transition-transform mube:duration-200 mube:animar-entrar mube:hover:-translate-y-0.5 mube:focus-visible:shadow-focus ${posicao === "direita" ? "mube:right-5" : "mube:left-5"} ${porLer ? "" : "mube:pr-4"}`, children: [_jsx(Icone, { nome: "Comment" }), rotulo, porLer > 0 && (_jsx("span", { className: "mube:flex mube:h-5 mube:min-w-5 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary-foreground mube:px-1.5 mube:text-label-sm mube:text-primary", children: porLer > 99 ? "99+" : porLer }))] })), aberto && (_jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": rotulo, className: "mube:fixed mube:inset-0 mube:z-[2147483001] mube:flex mube:bg-card mube:animar-entrar", children: [_jsxs("aside", { className: "mube:hidden mube:w-60 mube:shrink-0 mube:flex-col mube:border-r mube:border-border mube:bg-background mube:md:flex", children: [_jsxs("div", { className: "mube:flex mube:h-14 mube:items-center mube:gap-2 mube:pr-2 mube:pl-4", children: [_jsx("span", { className: "mube:flex mube:size-7 mube:items-center mube:justify-center mube:rounded-lg mube:bg-primary mube:text-primary-foreground", children: _jsx(Icone, { nome: "Comment" }) }), _jsx("h1", { className: "mube:flex-1 mube:truncate mube:text-label-strong mube:text-foreground", children: rotulo }), _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar", onClick: () => setAberto(false) })] }), (sessao.liberado || sessao.gestor) && (_jsxs("nav", { "aria-label": "Sec\u00E7\u00F5es do suporte", className: "mube:flex mube:flex-1 mube:flex-col mube:gap-0.5 mube:px-2 mube:pt-2 mube:pb-3", children: [principais.map((s) => (_jsx(ItemLateral, { ...s, ativo: atual === s.valor, aoEscolher: () => setSeparador(s.valor) }, s.valor))), gestao.length > 0 && principais.length > 0 && _jsx("span", { "aria-hidden": true, className: "mube:mx-3 mube:my-2 mube:h-px mube:bg-border" }), gestao.map((s) => (_jsx(ItemLateral, { ...s, ativo: atual === s.valor, aoEscolher: () => setSeparador(s.valor) }, s.valor)))] }))] }), _jsxs("div", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsxs("header", { className: "mube:flex mube:h-14 mube:shrink-0 mube:items-center mube:gap-2 mube:border-b mube:border-border mube:pr-3 mube:pl-4 mube:md:hidden", children: [_jsx("h1", { className: "mube:flex-1 mube:text-h4 mube:text-foreground", children: rotulo }), _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar", onClick: () => setAberto(false) })] }), !sessao.liberado && !sessao.gestor ? (_jsx(Vazio, { icone: "Inbox", titulo: "Sem acesso ao suporte deste projeto", texto: "Pe\u00E7a a quem gere o software na sua empresa para lhe dar acesso. Depois disso, pode reportar problemas e acompanhar os pedidos aqui." })) : (_jsxs(_Fragment, { children: [_jsxs("main", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col", children: [atual === "tickets" && _jsx(Tickets, {}), atual === "drive" && _jsx(Drive, {}), atual === "notificacoes" && _jsx(Notificacoes, {}), atual === "acessos" && _jsx(Acessos, {})] }), separadores.length > 1 && (_jsx("nav", { "aria-label": "Sec\u00E7\u00F5es do suporte", className: "mube:flex mube:shrink-0 mube:border-t mube:border-border mube:bg-card mube:md:hidden", children: separadores.map((s) => {
                                                const ativo = atual === s.valor;
                                                return (_jsxs("button", { type: "button", "aria-current": ativo ? "page" : undefined, onClick: () => setSeparador(s.valor), className: `mube:relative mube:flex mube:h-14 mube:flex-1 mube:flex-col mube:items-center mube:justify-center mube:gap-1 mube:text-label-sm mube:transition-colors ${ativo ? "mube:text-foreground" : "mube:text-muted-foreground"}`, children: [_jsx(Icone, { nome: s.icone, tamanho: 18 }), s.rotulo, s.n ? _jsx("span", { className: "mube:absolute mube:top-2 mube:left-[calc(50%+6px)] mube:size-2 mube:rounded-full mube:bg-primary" }) : null] }, s.valor));
                                            }) }))] }))] })] }))] }) }), document.body);
}
/** Uma secção na barra lateral (Figma: Shell, item da barra; o ativo em pílula escura). */
function ItemLateral({ rotulo, icone, n, ativo, aoEscolher }) {
    return (_jsxs("button", { type: "button", "aria-current": ativo ? "page" : undefined, onClick: aoEscolher, className: `mube:flex mube:h-9 mube:w-full mube:items-center mube:gap-2.5 mube:rounded-lg mube:px-3 mube:text-left mube:text-label mube:transition-colors mube:duration-150 mube:focus-visible:shadow-focus ${ativo ? "mube:bg-primary mube:text-primary-foreground" : "mube:text-foreground mube:hover:bg-muted"}`, children: [_jsx(Icone, { nome: icone }), _jsx("span", { className: "mube:flex-1 mube:truncate", children: rotulo }), n ? (_jsx("span", { className: `mube:min-w-5 mube:rounded-full mube:px-1.5 mube:text-center mube:text-label-sm ${ativo ? "mube:bg-primary-foreground mube:text-primary" : "mube:bg-muted mube:text-muted-foreground"}`, children: n })) : null] }));
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
