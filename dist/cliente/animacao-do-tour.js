"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Player } from "@remotion/player";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AnimacaoAcessos, AnimacaoCredenciais, AnimacaoDrive, AnimacaoNotificacoes, AnimacaoTickets, DURACAO_DAS_SECOES } from "./animacoes-das-secoes.js";
import { Icone } from "./ui.js";
/**
 * O palco do convite ao tour (S65), em Remotion, no mesmo palco do banner das
 * push do Operacional (Figma 27:5). Três cenas em loop, para chamar a
 * atenção: (1) o tile do suporte e, à volta, os de cada secção (Tickets,
 * Drive, Credenciais, Notificações); (2) chega uma notificação; (3) um
 * comentário do cliente e a resposta da equipa, depois de "a escrever…".
 * Só `useCurrentFrame`/`interpolate` (nada de transições CSS lá dentro).
 */
const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);
const preso = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
// As cenas (em frames, a 30 por segundo), com 12 frames de passagem entre elas.
const CENA = { tiles: [0, 120], notificacao: [120, 220], conversa: [220, 360] };
const PASSAGEM = 12;
export const ANIMACAO_DO_TOUR = { largura: 362, altura: 170, fps: 30, duracao: 360 };
const CENTRO = { x: 181, y: 85 };
const LADO = 76;
const MINI = 44;
const SATELITES = [
    { icone: "Kanban", tile: "mube:bg-tile-teal", x: 66, y: 46 },
    { icone: "Folder", tile: "mube:bg-tile-navy", x: 296, y: 46 },
    { icone: "Key", tile: "mube:bg-tile-sepia", x: 66, y: 124 },
    { icone: "Bell", tile: "mube:bg-tile-rose", x: 296, y: 124 },
];
function Tile({ icone, tile, lado, x, y, escala = 1, opacidade = 1, raio }) {
    return (_jsxs("div", { className: `mube:absolute mube:flex mube:items-center mube:justify-center mube:overflow-hidden mube:border mube:border-white/28 mube:text-white mube:shadow-tile-rim ${tile}`, style: { left: x - lado / 2, top: y - lado / 2, width: lado, height: lado, borderRadius: raio, transform: `scale(${escala})`, opacity: opacidade }, children: [_jsx("span", { className: "mube:absolute mube:inset-0 mube:bg-tile-gloss" }), _jsx(Icone, { nome: icone, tamanho: Math.round(lado * 0.46), className: "mube:relative" })] }));
}
/** Quanto se vê de uma cena: entra e sai com uma passagem curta. */
function visivel(frame, [de, ate]) {
    return interpolate(frame, [de, de + PASSAGEM, ate - PASSAGEM, ate], [de === 0 ? 1 : 0, 1, 1, 0], preso);
}
// ─── Cena 1: as secções à volta do suporte ───────────────────────────────────
function CenaDosTiles({ frame }) {
    const pulso = 1 + 0.035 * Math.sin((frame / 30) * Math.PI);
    const anel = interpolate(frame, [4, 36], [0, 1], { ...preso, easing: SUAVE });
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "mube:absolute mube:rounded-full mube:border mube:border-white/60", style: { left: CENTRO.x - 60, top: CENTRO.y - 60, width: 120, height: 120, transform: `scale(${0.6 + anel * 1.6})`, opacity: interpolate(anel, [0, 0.2, 1], [0, 0.7, 0]) } }), SATELITES.map((s, i) => {
                const parte = 6 + i * 9;
                const ida = interpolate(frame, [parte, parte + 24], [0, 1], { ...preso, easing: SUAVE });
                const volta = interpolate(frame, [88 + i * 3, 108 + i * 3], [0, 1], { ...preso, easing: Easing.in(Easing.cubic) });
                const t = ida * (1 - volta);
                const flutua = Math.sin(((frame + i * 17) / 30) * Math.PI * 0.8) * 3 * t;
                return (_jsx(Tile, { icone: s.icone, tile: s.tile, lado: MINI, raio: 13, x: CENTRO.x + (s.x - CENTRO.x) * t, y: CENTRO.y + (s.y - CENTRO.y) * t + flutua, escala: 0.4 + 0.6 * t, opacidade: interpolate(t, [0, 0.25, 1], [0, 1, 1]) }, s.icone));
            }), _jsx(Tile, { icone: "Comment", tile: "mube:bg-tile-primary", lado: LADO, raio: 20, x: CENTRO.x, y: CENTRO.y, escala: pulso })] }));
}
// ─── Cena 2: chega uma notificação ───────────────────────────────────────────
function Cartao({ y, titulo, texto, icone, tile, opacidade = 1, deslize = 0, escala = 1 }) {
    return (_jsxs("div", { className: "mube:absolute mube:flex mube:items-center mube:gap-2.5 mube:rounded-[14px] mube:bg-card mube:px-2.5 mube:shadow-soft-4", style: { left: 41, top: y, width: 280, height: 54, opacity: opacidade, transform: `translateY(${deslize}px) scale(${escala})` }, children: [_jsxs("div", { className: `mube:relative mube:flex mube:size-[34px] mube:shrink-0 mube:items-center mube:justify-center mube:overflow-hidden mube:rounded-[10px] mube:text-white mube:shadow-tile-rim-sm ${tile}`, children: [_jsx("span", { className: "mube:absolute mube:inset-0 mube:bg-tile-gloss" }), _jsx(Icone, { nome: icone, tamanho: 16, className: "mube:relative" })] }), _jsxs("div", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsx("span", { className: "mube:truncate mube:text-label mube:text-foreground", children: titulo }), _jsx("span", { className: "mube:truncate mube:text-body-xs mube:text-muted-foreground", children: texto })] })] }));
}
function CenaDaNotificacao({ frame }) {
    const f = frame - CENA.notificacao[0];
    // A de trás já lá estava; a nova cai por cima com uma mola.
    const chega = interpolate(f, [10, 34], [0, 1], { ...preso, easing: Easing.out(Easing.back(1.6)) });
    const toque = interpolate(f, [34, 40, 48], [0, 1, 0], preso);
    return (_jsxs(_Fragment, { children: [_jsx(Cartao, { y: 68, titulo: "Estado atualizado", texto: "LOJA-11 passou para Corre\u00E7\u00E3o.", icone: "Refresh", tile: "mube:bg-tile-navy", opacidade: 0.55, escala: 0.92, deslize: 12 }), _jsx(Cartao, { y: 48, titulo: "Nova resposta da equipa \u00B7 LOJA-12", texto: "J\u00E1 est\u00E1 corrigido, pode testar?", icone: "Bell", tile: "mube:bg-tile-teal", opacidade: chega, deslize: (1 - chega) * -44, escala: 1 + toque * 0.03 })] }));
}
// ─── Cena 3: o comentário e a resposta ───────────────────────────────────────
function Balao({ lado, texto, quem, x, y, largura, opacidade, deslize }) {
    const daEquipa = lado === "equipa";
    return (_jsxs("div", { className: "mube:absolute mube:flex mube:flex-col mube:gap-0.5", style: { left: x, top: y, width: largura, opacity: opacidade, transform: `translateY(${deslize}px)`, alignItems: daEquipa ? "flex-end" : "flex-start" }, children: [_jsx("span", { className: "mube:text-[10px] mube:text-muted-foreground", children: quem }), _jsx("span", { className: `mube:rounded-[14px] mube:px-3 mube:py-1.5 mube:text-body-xs mube:shadow-soft-3 ${daEquipa ? "mube:rounded-br-[4px] mube:bg-primary mube:text-primary-foreground" : "mube:rounded-bl-[4px] mube:bg-card mube:text-foreground"}`, children: texto })] }));
}
function CenaDaConversa({ frame }) {
    const f = frame - CENA.conversa[0];
    const pergunta = interpolate(f, [8, 26], [0, 1], { ...preso, easing: SUAVE });
    const aEscrever = interpolate(f, [36, 44, 74, 80], [0, 1, 1, 0], preso);
    const resposta = interpolate(f, [80, 100], [0, 1], { ...preso, easing: SUAVE });
    return (_jsxs(_Fragment, { children: [_jsx(Balao, { lado: "cliente", quem: "Marina \u00B7 cliente", texto: "O bot\u00E3o de guardar n\u00E3o responde.", x: 22, y: 22, largura: 240, opacidade: pergunta, deslize: (1 - pergunta) * 10 }), _jsx("div", { className: "mube:absolute mube:flex mube:items-center mube:gap-1 mube:rounded-[14px] mube:rounded-br-[4px] mube:bg-primary mube:px-3 mube:py-2.5 mube:shadow-soft-3", style: { right: 22, top: 104, opacity: aEscrever }, children: [0, 1, 2].map((i) => (_jsx("span", { className: "mube:size-1.5 mube:rounded-full mube:bg-primary-foreground", style: { opacity: 0.4 + 0.6 * Math.max(0, Math.sin(((f - i * 5) / 30) * Math.PI * 2)) } }, i))) }), _jsx(Balao, { lado: "equipa", quem: "Equipa Mube", texto: "J\u00E1 est\u00E1 corrigido, pode testar?", x: 100, y: 92, largura: 240, opacidade: resposta, deslize: (1 - resposta) * 10 })] }));
}
export function AnimacaoDoTour() {
    const frame = useCurrentFrame();
    return (_jsxs(AbsoluteFill, { children: [_jsx(AbsoluteFill, { style: { opacity: visivel(frame, CENA.tiles) }, children: _jsx(CenaDosTiles, { frame: frame }) }), frame >= CENA.notificacao[0] && frame < CENA.notificacao[1] && (_jsx(AbsoluteFill, { style: { opacity: visivel(frame, CENA.notificacao) }, children: _jsx(CenaDaNotificacao, { frame: frame }) })), frame >= CENA.conversa[0] && (_jsx(AbsoluteFill, { style: { opacity: visivel(frame, CENA.conversa) }, children: _jsx(CenaDaConversa, { frame: frame }) }))] }));
}
const CENAS = {
    convite: { componente: AnimacaoDoTour, duracao: ANIMACAO_DO_TOUR.duracao },
    tickets: { componente: AnimacaoTickets, duracao: DURACAO_DAS_SECOES.tickets },
    drive: { componente: AnimacaoDrive, duracao: DURACAO_DAS_SECOES.drive },
    credenciais: { componente: AnimacaoCredenciais, duracao: DURACAO_DAS_SECOES.credenciais },
    notificacoes: { componente: AnimacaoNotificacoes, duracao: DURACAO_DAS_SECOES.notificacoes },
    acessos: { componente: AnimacaoAcessos, duracao: DURACAO_DAS_SECOES.acessos },
};
/** O `<Player>` em loop, com a cena pedida (o convite ou a de uma secção). Carrega-se só quando aparece (React.lazy). */
export default function PalcoDoTour({ cena = "convite" }) {
    const c = CENAS[cena];
    return (_jsx(Player, { component: c.componente, durationInFrames: c.duracao, compositionWidth: ANIMACAO_DO_TOUR.largura, compositionHeight: ANIMACAO_DO_TOUR.altura, fps: ANIMACAO_DO_TOUR.fps, autoPlay: true, loop: true, controls: false, clickToPlay: false, doubleClickToFullscreen: false, spaceKeyToPlayOrPause: false, initiallyMuted: true, acknowledgeRemotionLicense: true, style: { width: "100%", height: "100%" } }, cena));
}
