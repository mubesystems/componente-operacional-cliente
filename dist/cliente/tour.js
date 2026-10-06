"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Botao, BotaoIcone, Icone, SeloDeEstado } from "./ui.js";
/**
 * O tour guiado do componente (S65). O banner, no mesmo layout do convite às
 * push do Operacional (Figma 27:5), apresenta o novo espaço da Mube no
 * software; o tour mostra cada secção, uma a uma, com uma pré-visualização
 * de exemplo. **Não lê nem grava nada na plataforma**: só, no fim (ou no
 * "Agora não"), fica marcado no banco do próprio software (`mube_tour`), para
 * o banner não voltar a aparecer.
 */
const PalcoDoTour = lazy(() => import("./animacao-do-tour.js"));
function semMovimento() {
    return typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function TileMini({ icone, tile, lado = 28 }) {
    return (_jsxs("span", { "aria-hidden": true, className: `mube:relative mube:flex mube:shrink-0 mube:items-center mube:justify-center mube:overflow-hidden mube:border mube:border-white/28 mube:text-white mube:shadow-tile-rim-sm ${tile}`, style: { width: lado, height: lado, borderRadius: Math.round(lado * 0.28) }, children: [_jsx("span", { className: "mube:absolute mube:inset-0 mube:bg-tile-gloss" }), _jsx(Icone, { nome: icone, tamanho: Math.round(lado * 0.5), className: "mube:relative" })] }));
}
/** O palco: o wash, o glow e a animação da cena (ou o tile parado, com movimento reduzido). */
function Palco({ className = "", cena = "convite" }) {
    const [parado] = useState(semMovimento);
    return (_jsxs("div", { "aria-hidden": true, className: `mube:relative mube:w-full mube:overflow-hidden mube:rounded-[10px] mube:bg-background ${className}`, style: { aspectRatio: "362 / 170" }, children: [_jsx("div", { className: "mube:absolute mube:inset-0 mube:bg-wash-navy" }), _jsx("div", { className: "mube:absolute mube:top-[24%] mube:left-[60%] mube:size-[72%] mube:bg-glow-navy" }), parado ? (_jsx("div", { className: "mube:absolute mube:inset-0 mube:flex mube:items-center mube:justify-center", children: _jsx(TileMini, { icone: "Comment", tile: "mube:bg-tile-primary", lado: 48 }) })) : (_jsx(Suspense, { fallback: _jsx("div", { className: "mube:absolute mube:inset-0 mube:flex mube:items-center mube:justify-center", children: _jsx(TileMini, { icone: "Comment", tile: "mube:bg-tile-primary", lado: 48 }) }), children: _jsx("div", { className: "mube:absolute mube:inset-0", children: _jsx(PalcoDoTour, { cena: cena }) }) }))] }));
}
/**
 * O convite ao tour, a flutuar no canto inferior direito, como o convite às
 * push do Operacional (362 px). No telemóvel, por cima da barra das secções.
 */
export function BannerDoTour({ aoComecar, aoDispensar }) {
    return (_jsxs("section", { "aria-labelledby": "mube-tour-titulo", className: "mube:fixed mube:inset-x-3 mube:bottom-[calc(4.25rem+env(safe-area-inset-bottom))] mube:z-[2147482999] mube:flex mube:flex-col mube:overflow-hidden mube:rounded-[18px] mube:bg-card mube:p-2 mube:shadow-soft-5 mube:animar-entrar mube:md:inset-x-auto mube:md:right-6 mube:md:bottom-6 mube:md:w-[362px]", children: [_jsx(Palco, {}), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1.5 mube:px-4 mube:pt-3.5 mube:pb-4", children: [_jsx("h2", { id: "mube-tour-titulo", className: "mube:text-h4 mube:text-card-foreground", children: "O novo espa\u00E7o da Mube" }), _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: "Fale com a equipa, acompanhe os pedidos e partilhe ficheiros e acessos, tudo aqui no seu software. Veja como em 1 minuto." }), _jsxs("div", { className: "mube:mt-2.5 mube:flex mube:gap-2", children: [_jsx(Botao, { icone: "Play", onClick: aoComecar, children: "Fazer o tour" }), _jsx(Botao, { estilo: "fantasma", onClick: aoDispensar, children: "Agora n\u00E3o" })] })] })] }));
}
// ─── As pré-visualizações de exemplo (nada aqui é real) ──────────────────────
function Linha({ children }) {
    return _jsx("div", { className: "mube:flex mube:items-center mube:gap-2 mube:rounded-lg mube:bg-card mube:px-2.5 mube:py-2 mube:shadow-soft-2", children: children });
}
function Interruptor({ ligado }) {
    return (_jsx("span", { "aria-hidden": true, className: `mube:relative mube:h-4 mube:w-7 mube:shrink-0 mube:rounded-full ${ligado ? "mube:bg-primary" : "mube:bg-input"}`, children: _jsx("span", { className: `mube:absolute mube:top-0.5 mube:left-0.5 mube:size-3 mube:rounded-full mube:bg-card ${ligado ? "mube:translate-x-3" : ""}` }) }));
}
const DEMOS = {
    tickets: (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [_jsxs(Linha, { children: [_jsx("span", { className: "mube:min-w-0 mube:flex-1 mube:truncate mube:text-label-sm mube:text-foreground", children: "COR-012 \u00B7 O bot\u00E3o de guardar n\u00E3o responde" }), _jsx(SeloDeEstado, { estado: "correcao" })] }), _jsxs(Linha, { children: [_jsx("span", { className: "mube:min-w-0 mube:flex-1 mube:truncate mube:text-label-sm mube:text-foreground", children: "COR-011 \u00B7 A fatura sai em branco" }), _jsx(SeloDeEstado, { estado: "aguardando_aceite" })] }), _jsxs("span", { className: "mube:inline-flex mube:h-7 mube:items-center mube:gap-1.5 mube:self-start mube:rounded-full mube:bg-primary mube:px-3 mube:text-label-sm mube:text-primary-foreground", children: [_jsx(Icone, { nome: "Plus", tamanho: 12 }), "Reportar um problema"] })] })),
    drive: (_jsx("div", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [
            { nome: "Contratos", icone: "Folder" },
            { nome: "Logótipos e imagens", icone: "Folder" },
            { nome: "proposta-final.pdf", icone: "File text" },
        ].map((f) => (_jsxs(Linha, { children: [_jsx(Icone, { nome: f.icone, className: "mube:text-muted-foreground" }), _jsx("span", { className: "mube:flex-1 mube:truncate mube:text-label-sm mube:text-foreground", children: f.nome })] }, f.nome))) })),
    credenciais: (_jsx("div", { className: "mube:grid mube:grid-cols-2 mube:gap-1.5", children: [
            { nome: "Domínio", icone: "Globo", tile: "mube:bg-tile-navy", estado: "Por preencher" },
            { nome: "Cloudflare", icone: "Nuvem", tile: "mube:bg-tile-sepia", estado: "Enviada" },
        ].map((c) => (_jsxs("div", { className: "mube:flex mube:flex-col mube:items-center mube:gap-1.5 mube:rounded-lg mube:bg-card mube:p-2.5 mube:shadow-soft-2", children: [_jsx(TileMini, { icone: c.icone, tile: c.tile, lado: 32 }), _jsx("span", { className: "mube:text-label-sm mube:text-foreground", children: c.nome }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: c.estado })] }, c.nome))) })),
    notificacoes: (_jsx("div", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [
            { titulo: "Nova resposta da equipa", corpo: "COR-012: “Já está corrigido, pode testar?”", icone: "Comment" },
            { titulo: "Correção à espera do seu aceite", corpo: "COR-011 está pronto para validar.", icone: "Check circle" },
        ].map((n) => (_jsxs(Linha, { children: [_jsx(Icone, { nome: n.icone, className: "mube:text-muted-foreground" }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsx("span", { className: "mube:truncate mube:text-label-sm mube:text-foreground", children: n.titulo }), _jsx("span", { className: "mube:truncate mube:text-body-xs mube:text-muted-foreground", children: n.corpo })] }), _jsx("span", { "aria-hidden": true, className: "mube:size-1.5 mube:shrink-0 mube:rounded-full mube:bg-primary" })] }, n.titulo))) })),
    acessos: (_jsx("div", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [
            { nome: "Ana Ribeiro", suporte: true, drive: true },
            { nome: "Rui Matos", suporte: true, drive: false },
        ].map((p) => (_jsxs(Linha, { children: [_jsx("span", { className: "mube:flex mube:size-6 mube:items-center mube:justify-center mube:rounded-full mube:bg-muted mube:text-[10px] mube:text-muted-foreground", children: p.nome
                        .split(" ")
                        .map((x) => x[0])
                        .join("") }), _jsx("span", { className: "mube:flex-1 mube:truncate mube:text-label-sm mube:text-foreground", children: p.nome }), _jsx(Interruptor, { ligado: p.suporte }), _jsx(Interruptor, { ligado: p.drive })] }, p.nome))) })),
};
const PASSOS = {
    suporte: {
        titulo: "O espaço da Mube, no seu software",
        texto: "Aqui fala diretamente com a equipa que desenvolve o seu software: reporta problemas, acompanha cada correção e partilha o que for preciso. Vamos ver cada parte.",
    },
    tickets: {
        titulo: "Tickets",
        texto: "Reporte um problema com texto, áudio gravado e ficheiros, e diga o impacto. Acompanhe cada pedido em quadro ou lista, converse com a equipa e, no fim, aceite ou recuse a correção.",
    },
    drive: {
        titulo: "Drive",
        texto: "Os ficheiros do projeto num só sítio: o que a Mube partilha consigo e o que envia para a equipa. Crie pastas, arraste ficheiros e mova vários de uma vez.",
    },
    credenciais: {
        titulo: "Credenciais",
        texto: "Quando a equipa precisar de um acesso (o domínio, a Cloudflare, uma chave de API…), o pedido aparece aqui. Fica cifrado e pode vê-lo, editá-lo ou retirá-lo quando quiser.",
    },
    notificacoes: {
        titulo: "Notificações",
        texto: "Respostas da equipa, mudanças de estado e pedidos de aceite. Quando houver novidades, aparece também um aviso no canto e um número no menu Suporte.",
    },
    acessos: {
        titulo: "Acessos",
        texto: "Escolha quem da sua equipa usa o suporte e, dessas pessoas, quem vê a Drive e quem envia as credenciais.",
    },
};
/** O elemento da secção que está à vista (o da barra lateral no computador, o de baixo no telemóvel). */
function alvoVisivel(secao) {
    for (const el of document.querySelectorAll(`[data-mube-tour="${secao}"]`)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0)
            return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
    return null;
}
export function Tour({ secoes, aoSair, aoConcluir }) {
    const passos = [...secoes, "fim"];
    const [i, setI] = useState(0);
    const passo = passos[i];
    const [alvo, setAlvo] = useState(null);
    const [janela, setJanela] = useState({ largura: 0, altura: 0 });
    const medir = useCallback(() => {
        setJanela({ largura: window.innerWidth, altura: window.innerHeight });
        setAlvo(passo === "fim" ? null : alvoVisivel(passo));
    }, [passo]);
    // Mede no frame seguinte (o alvo já desenhado) e de novo quando a janela muda.
    useEffect(() => {
        const id = requestAnimationFrame(medir);
        window.addEventListener("resize", medir);
        window.addEventListener("scroll", medir, true);
        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener("resize", medir);
            window.removeEventListener("scroll", medir, true);
        };
    }, [medir]);
    const ultimo = i === passos.length - 1;
    const seguinte = useCallback(() => (ultimo ? aoConcluir() : setI((n) => n + 1)), [ultimo, aoConcluir]);
    const anterior = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
    useEffect(() => {
        const tecla = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                aoSair();
            }
            else if (e.key === "ArrowRight")
                seguinte();
            else if (e.key === "ArrowLeft")
                anterior();
        };
        document.addEventListener("keydown", tecla, true);
        return () => document.removeEventListener("keydown", tecla, true);
    }, [aoSair, seguinte, anterior]);
    // Onde fica o cartão: à direita do alvo no computador; por cima, no telemóvel; ao centro no fim.
    const largura = Math.min(340, janela.largura - 24);
    const folga = 10;
    let posicao;
    if (!alvo)
        posicao = { left: (janela.largura - largura) / 2, top: Math.max(12, janela.altura / 2 - 210) };
    else if (alvo.left + alvo.width + 16 + largura < janela.largura)
        posicao = { left: alvo.left + alvo.width + 16, top: Math.min(Math.max(12, alvo.top - 24), janela.altura - 440) };
    else
        posicao = { left: 12, bottom: janela.altura - alvo.top + folga + 8, width: janela.largura - 24 };
    const dados = passo === "fim" ? null : PASSOS[passo];
    return (_jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": "Tour do suporte", className: "mube:fixed mube:inset-0 mube:z-[2147483003]", children: [alvo ? (_jsx("div", { "aria-hidden": true, className: "mube:pointer-events-none mube:absolute mube:rounded-[12px] mube:ring-2 mube:ring-white/80 mube:transition-all mube:duration-300 mube:ease-out", style: { top: alvo.top - 4, left: alvo.left - 4, width: alvo.width + 8, height: alvo.height + 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" } })) : (_jsx("div", { "aria-hidden": true, className: "mube:absolute mube:inset-0 mube:bg-black/55 mube:animar-entrar" })), _jsxs("section", { "aria-live": "polite", className: "mube:absolute mube:flex mube:flex-col mube:overflow-hidden mube:rounded-[18px] mube:bg-card mube:p-2 mube:shadow-soft-6 mube:animar-entrar", style: { width: largura, ...posicao }, children: [passo === "suporte" || passo === "fim" ? (_jsx(Palco, {})) : !semMovimento() ? (
                    // Cada secção tem a sua cena animada, com dados de exemplo.
                    _jsxs("div", { className: "mube:relative", children: [_jsx(Palco, { cena: passo }), _jsx("span", { className: "mube:absolute mube:top-2 mube:right-2 mube:z-10 mube:rounded-full mube:bg-card/90 mube:px-2 mube:py-0.5 mube:text-[10px] mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Exemplo" })] })) : (_jsxs("div", { className: "mube:relative mube:overflow-hidden mube:rounded-[10px] mube:bg-background mube:p-3", children: [_jsx("div", { "aria-hidden": true, className: "mube:absolute mube:inset-0 mube:bg-wash-navy" }), _jsx("span", { className: "mube:absolute mube:top-2 mube:right-2 mube:z-10 mube:rounded-full mube:bg-card/90 mube:px-2 mube:py-0.5 mube:text-[10px] mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Exemplo" }), _jsx("div", { className: "mube:relative mube:pt-4", children: DEMOS[passo] })] })), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1.5 mube:px-3 mube:pt-3 mube:pb-3", children: [_jsxs("div", { className: "mube:flex mube:items-center mube:gap-2", children: [_jsxs("span", { className: "mube:text-label-sm mube:text-muted-foreground", children: [i + 1, " de ", passos.length] }), _jsx("span", { className: "mube:flex mube:flex-1 mube:gap-1", children: passos.map((_, n) => (_jsx("span", { "aria-hidden": true, className: `mube:h-1 mube:flex-1 mube:rounded-full mube:transition-colors mube:duration-300 ${n <= i ? "mube:bg-primary" : "mube:bg-muted"}` }, n))) }), _jsx(BotaoIcone, { icone: "X", rotulo: "Sair do tour", onClick: aoSair })] }), _jsx("h2", { className: "mube:text-h4 mube:text-card-foreground", children: dados ? dados.titulo : "Pronto!" }), _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: dados
                                    ? dados.texto
                                    : "Já sabe onde está tudo. Quando houver novidades, aparece um aviso no canto e um número no menu Suporte. Pode rever este tour quando quiser, no fundo do menu." }), _jsxs("div", { className: "mube:mt-2 mube:flex mube:items-center mube:gap-2", children: [i > 0 && (_jsx(Botao, { estilo: "fantasma", tamanho: "sm", icone: "Chevron left", onClick: anterior, children: "Anterior" })), _jsx(Botao, { tamanho: "sm", className: "mube:ml-auto", onClick: seguinte, children: ultimo ? "Concluir" : i === 0 ? "Começar" : "Seguinte" })] })] })] }, i)] }));
}
