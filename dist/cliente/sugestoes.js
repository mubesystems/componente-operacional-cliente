"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSuporte } from "./componente.js";
import { NovoRelato } from "./relato.js";
import { Botao, BotaoIcone, Camada, dia, ErroAoCarregar, Esqueleto, Icone, tamanho, Vazio } from "./ui.js";
const ESTADO = {
    recebida: { rotulo: "Recebida", classe: "mube:bg-state-triagem-bg mube:text-state-triagem-fg" },
    vamos_fazer: { rotulo: "Vamos fazer", classe: "mube:bg-state-correcao-bg mube:text-state-correcao-fg" },
    feita: { rotulo: "Feita", classe: "mube:bg-state-concluida-bg mube:text-state-concluida-fg" },
    nao_avancou: { rotulo: "Não avançou", classe: "mube:bg-state-descartada-bg mube:text-state-descartada-fg mube:border mube:border-border" },
};
const ORDEM = ["recebida", "vamos_fazer", "feita", "nao_avancou"];
function SeloDaSugestao({ estado }) {
    const s = ESTADO[estado] ?? ESTADO.recebida;
    return _jsx("span", { className: `mube:inline-flex mube:h-5 mube:shrink-0 mube:items-center mube:rounded-full mube:px-2 mube:text-label-sm mube:whitespace-nowrap ${s.classe}`, children: s.rotulo });
}
const quem = (s) => s.sugerido_por?.nome?.split(" ")[0] ?? "Alguém da equipa";
function Cartao({ s, aoAbrir }) {
    return (_jsxs("button", { type: "button", onClick: aoAbrir, className: "mube:flex mube:w-full mube:flex-col mube:gap-1.5 mube:rounded-[10px] mube:border mube:border-border mube:bg-card mube:p-2.5 mube:text-left mube:transition-colors mube:duration-150 mube:hover:bg-muted", children: [_jsx("span", { className: "mube:font-mono mube:text-mono-sm mube:text-muted-foreground", children: s.codigo }), _jsx("span", { className: "mube:text-label mube:text-primary", children: s.titulo }), _jsxs("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: [quem(s), " \u00B7 ", dia(s.recebida_em)] })] }));
}
/** Computador: o quadro. A Mube muda o estado; aqui os cartões só se abrem. */
function Quadro({ sugestoes, aoAbrir }) {
    return (_jsx("div", { className: "mube:hidden mube:min-h-0 mube:flex-1 mube:gap-2 mube:overflow-x-auto mube:px-4 mube:pt-2 mube:pb-4 mube:md:flex", children: ORDEM.map((estado) => {
            const daColuna = sugestoes.filter((s) => s.estado === estado);
            return (_jsxs("section", { "aria-label": ESTADO[estado].rotulo, className: "mube:flex mube:min-w-[220px] mube:flex-1 mube:shrink-0 mube:flex-col mube:gap-2 mube:rounded-xl mube:bg-muted mube:p-2", children: [_jsxs("header", { className: "mube:flex mube:items-center mube:gap-1.5 mube:px-0.5 mube:pt-0.5 mube:pb-1", children: [_jsx(SeloDaSugestao, { estado: estado }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: daColuna.length })] }), daColuna.map((s) => (_jsx(Cartao, { s: s, aoAbrir: () => aoAbrir(s.numero) }, s.numero)))] }, estado));
        }) }));
}
/** Telemóvel: quatro colunas não cabem; a lista leva o estado em cada uma. */
function Lista({ sugestoes, aoAbrir }) {
    return (_jsx("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col mube:gap-2 mube:overflow-y-auto mube:px-4 mube:pt-2 mube:pb-24 mube:md:hidden", children: sugestoes.map((s) => (_jsxs("button", { type: "button", onClick: () => aoAbrir(s.numero), className: "mube:flex mube:w-full mube:flex-col mube:gap-1.5 mube:rounded-xl mube:border mube:border-border mube:bg-card mube:p-3 mube:text-left", children: [_jsx("span", { className: "mube:text-label mube:text-primary", children: s.titulo }), _jsxs("span", { className: "mube:flex mube:items-center mube:justify-between mube:gap-2", children: [_jsxs("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: [quem(s), " \u00B7 ", dia(s.recebida_em)] }), _jsx(SeloDaSugestao, { estado: s.estado })] })] }, s.numero))) }));
}
/** A folha lateral, como o detalhe de um ticket: a resposta da Mube, a ideia, os anexos e o que aconteceu. */
function Detalhe({ numero, aoFechar }) {
    const { api } = useSuporte();
    const [s, setS] = useState(null);
    const [erro, setErro] = useState(null);
    const carregar = useCallback(() => {
        api
            .sugestao(numero)
            .then((r) => {
            setErro(null);
            setS(r.sugestao);
        })
            .catch((e) => setErro(e.message));
    }, [api, numero]);
    useEffect(() => {
        carregar();
    }, [carregar]);
    useEffect(() => {
        const tecla = (e) => e.key === "Escape" && aoFechar();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [aoFechar]);
    return (_jsx(Camada, { children: _jsx("div", { className: "mube:fixed mube:inset-0 mube:z-[2147483001] mube:flex mube:justify-end mube:bg-black/30 mube:md:p-2", onMouseDown: (e) => e.target === e.currentTarget && aoFechar(), children: _jsxs("aside", { "aria-label": s?.codigo ?? "Sugestão", className: "mube:flex mube:h-full mube:w-full mube:flex-col mube:overflow-hidden mube:bg-card mube:shadow-soft-6 mube:animar-de-lado mube:md:w-[480px] mube:md:rounded-[20px]", children: [_jsxs("header", { className: "mube:flex mube:h-14 mube:shrink-0 mube:items-center mube:gap-2 mube:border-b mube:border-border mube:pr-3 mube:pl-4", children: [s && _jsx("span", { className: "mube:font-mono mube:text-mono-sm mube:text-muted-foreground", children: s.codigo }), s && _jsx(SeloDaSugestao, { estado: s.estado }), _jsx("span", { className: "mube:flex-1" }), _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar a sugest\u00E3o", onClick: aoFechar })] }), erro ? (_jsx(ErroAoCarregar, { texto: erro, aoTentar: carregar })) : !s ? (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-3 mube:p-4", children: [_jsx(Esqueleto, { className: "mube:h-6 mube:w-2/3" }), _jsx(Esqueleto, { className: "mube:h-24 mube:w-full" })] })) : (_jsxs("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col mube:gap-4 mube:overflow-y-auto mube:p-4", children: [_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1", children: [_jsx("h2", { className: "mube:text-h4 mube:text-primary", children: s.titulo }), _jsxs("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: [s.sugerido_por?.nome ?? "Alguém da equipa", " \u00B7 ", dia(s.recebida_em)] })] }), s.resposta && (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1 mube:rounded-xl mube:bg-muted mube:p-3", children: [_jsx("h3", { className: "mube:text-label mube:text-foreground", children: "Resposta da Mube" }), _jsx("p", { className: "mube:text-body-sm mube:whitespace-pre-wrap mube:text-foreground", children: s.resposta })] })), s.texto && (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1", children: [_jsx("h3", { className: "mube:text-label mube:text-foreground", children: "A sugest\u00E3o" }), _jsx("p", { className: "mube:text-body-sm mube:whitespace-pre-wrap mube:text-foreground", children: s.texto })] })), s.anexos.length > 0 && (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("h3", { className: "mube:text-label mube:text-foreground", children: "Anexos" }), s.anexos.map((a) => a.tipo_mime.startsWith("audio/") ? (_jsx("audio", { controls: true, src: a.url, className: "mube:h-10 mube:w-full", "aria-label": a.nome }, a.id)) : (_jsxs("a", { href: a.url, target: "_blank", rel: "noreferrer", className: "mube:flex mube:items-center mube:gap-2 mube:rounded-[10px] mube:border mube:border-border mube:px-3 mube:py-2 mube:text-body-sm mube:text-foreground mube:hover:bg-muted", children: [_jsx(Icone, { nome: "Attachment" }), _jsx("span", { className: "mube:min-w-0 mube:flex-1 mube:truncate", children: a.nome }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: tamanho(a.tamanho_bytes) })] }, a.id)))] })), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("h3", { className: "mube:text-label mube:text-foreground", children: "O que aconteceu" }), _jsx("ol", { className: "mube:flex mube:flex-col mube:gap-1.5", children: s.historico.map((h) => (_jsxs("li", { className: "mube:flex mube:items-center mube:gap-2 mube:text-body-sm mube:text-foreground", children: [_jsx(Icone, { nome: "Tick", className: "mube:text-state-concluida-fg" }), _jsx("span", { className: "mube:flex-1", children: h.rotulo }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: dia(h.em) })] }, h.rotulo))) })] })] }))] }) }) }));
}
/** A secção das sugestões (v0.8.0): o quadro, «Todas» e «As minhas», e a folha do detalhe. */
export function Sugestoes() {
    const { api, sessao, versao, sugestaoAberta, abrirSugestao, fecharSugestao } = useSuporte();
    const [sugestoes, setSugestoes] = useState(null);
    const [erro, setErro] = useState(null);
    const [nova, setNova] = useState(false);
    const [soMinhas, setSoMinhas] = useState(false);
    const carregar = useCallback(() => {
        api
            .sugestoes()
            .then((r) => {
            setErro(null);
            setSugestoes(r.sugestoes);
        })
            .catch((e) => setErro(e.message));
    }, [api]);
    useEffect(() => {
        carregar();
    }, [carregar, versao]);
    const eu = sessao.utilizador?.id;
    const visiveis = useMemo(() => (sugestoes ?? []).filter((s) => !soMinhas || s.sugerido_por?.id === eu), [sugestoes, soMinhas, eu]);
    return (_jsxs("div", { className: "mube:relative mube:flex mube:min-h-0 mube:flex-1 mube:flex-col", children: [_jsxs("div", { className: "mube:flex mube:items-center mube:justify-between mube:gap-3 mube:px-4 mube:pt-4 mube:pb-2 mube:md:px-6", children: [_jsx("h2", { className: "mube:text-h4 mube:text-primary", children: "Sugest\u00F5es" }), _jsx(Botao, { icone: "Plus", onClick: () => setNova(true), children: "Nova sugest\u00E3o" })] }), _jsx("div", { className: "mube:px-4 mube:pb-1 mube:md:px-6", children: _jsx("div", { role: "group", "aria-label": "Filtrar sugest\u00F5es", className: "mube:inline-flex mube:gap-1 mube:rounded-full mube:bg-muted mube:p-1", children: [
                        { rotulo: "Todas", valor: false },
                        { rotulo: "As minhas", valor: true },
                    ].map((f) => (_jsx("button", { type: "button", "aria-pressed": soMinhas === f.valor, onClick: () => setSoMinhas(f.valor), className: `mube:h-7 mube:rounded-full mube:px-3 mube:text-label-sm mube:transition-colors mube:duration-150 ${soMinhas === f.valor ? "mube:bg-card mube:text-foreground mube:shadow-soft-2" : "mube:text-muted-foreground mube:hover:text-foreground"}`, children: f.rotulo }, f.rotulo))) }) }), erro ? (_jsx(ErroAoCarregar, { texto: erro, aoTentar: carregar })) : !sugestoes ? (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2 mube:p-4", children: [_jsx(Esqueleto, { className: "mube:h-16 mube:w-full" }), _jsx(Esqueleto, { className: "mube:h-16 mube:w-full" })] })) : visiveis.length === 0 ? (_jsx(Vazio, { icone: "Ideia", titulo: soMinhas ? "Ainda não enviou nenhuma sugestão" : "Ainda não há sugestões", texto: "Tem uma ideia para melhorar o software? Envie-a \u00E0 equipa." })) : (_jsxs(_Fragment, { children: [_jsx(Quadro, { sugestoes: visiveis, aoAbrir: abrirSugestao }), _jsx(Lista, { sugestoes: visiveis, aoAbrir: abrirSugestao })] })), nova && _jsx(NovoRelato, { soSugestao: true, aoFechar: () => setNova(false), aoSugerir: carregar }), sugestaoAberta !== null && _jsx(Detalhe, { numero: sugestaoAberta, aoFechar: fecharSugestao })] }));
}
