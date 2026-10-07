"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Icone, SeloDeEstado } from "./ui.js";
/**
 * As cenas do tour (S65), uma por secção, em Remotion: no mesmo palco do
 * convite (362 × 170, a 30 fps), em loop. Mostram como se usa cada parte com
 * dados de exemplo; nada aqui fala com a plataforma. Só `useCurrentFrame` e
 * `interpolate` (nada de transições CSS lá dentro).
 */
const SUAVE = Easing.bezier(0.16, 1, 0.3, 1);
const MOLA = Easing.out(Easing.back(1.5));
const preso = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };
const entre = (f, de, ate, easing = SUAVE) => interpolate(f, [de, ate], [0, 1], { ...preso, easing });
export const DURACAO_DAS_SECOES = { tickets: 210, drive: 180, credenciais: 210, notificacoes: 180, acessos: 190 };
/** Toda a cena aparece no início e some no fim, para o loop não dar salto. */
function Cena({ frame, duracao, children }) {
    return _jsx(AbsoluteFill, { style: { opacity: interpolate(frame, [0, 8, duracao - 12, duracao], [0, 1, 1, 0], preso) }, children: children });
}
/** O cursor: um ponto escuro com anel, que "carrega" (encolhe) ao clicar. */
function Cursor({ x, y, carrega = 0, opacidade = 1 }) {
    return (_jsxs("div", { className: "mube:absolute mube:z-10", style: { left: x - 9, top: y - 9, opacity: opacidade }, children: [_jsx("div", { className: "mube:size-[18px] mube:rounded-full mube:border-2 mube:border-white mube:bg-foreground/85 mube:shadow-soft-4", style: { transform: `scale(${1 - carrega * 0.25})` } }), _jsx("div", { className: "mube:absolute mube:inset-0 mube:rounded-full mube:border mube:border-foreground/40", style: { transform: `scale(${1 + carrega * 1.4})`, opacity: carrega * 0.8 } })] }));
}
function Tile({ icone, tile, lado, className = "" }) {
    return (_jsxs("div", { className: `mube:relative mube:flex mube:shrink-0 mube:items-center mube:justify-center mube:overflow-hidden mube:border mube:border-white/28 mube:text-white mube:shadow-tile-rim-sm ${tile} ${className}`, style: { width: lado, height: lado, borderRadius: Math.round(lado * 0.28) }, children: [_jsx("span", { className: "mube:absolute mube:inset-0 mube:bg-tile-gloss" }), _jsx(Icone, { nome: icone, tamanho: Math.round(lado * 0.5), className: "mube:relative" })] }));
}
/** O caminho do cursor por pontos: [frame, x, y]. */
function caminho(frame, pontos) {
    const f = pontos.map((p) => p[0]);
    return {
        x: interpolate(frame, f, pontos.map((p) => p[1]), { ...preso, easing: SUAVE }),
        y: interpolate(frame, f, pontos.map((p) => p[2]), { ...preso, easing: SUAVE }),
    };
}
const clique = (frame, em) => interpolate(frame, [em, em + 4, em + 10], [0, 1, 0], preso);
// ─── Tickets: reportar e acompanhar ──────────────────────────────────────────
const COLUNAS = [
    { titulo: "Relato", x: 12 },
    { titulo: "Correção", x: 129 },
    { titulo: "Aguardando", x: 246 },
];
export function AnimacaoTickets() {
    const frame = useCurrentFrame();
    const d = DURACAO_DAS_SECOES.tickets;
    const botao = 1 - entre(frame, 46, 58);
    const cai = entre(frame, 58, 80, MOLA);
    const passa = entre(frame, 112, 140);
    const cursor = caminho(frame, [
        [0, 330, 160],
        [26, 181, 146],
        [60, 181, 146],
        [92, 60, 70],
        [112, 60, 70],
        [140, 177, 70],
        [160, 330, 160],
    ]);
    const naCorrecao = frame >= 128;
    return (_jsxs(Cena, { frame: frame, duracao: d, children: [COLUNAS.map((c, i) => (_jsx("div", { className: "mube:absolute mube:rounded-[10px] mube:bg-card/55", style: { left: c.x, top: 10, width: 104, height: 118 }, children: _jsxs("span", { className: "mube:absolute mube:top-2 mube:left-2.5 mube:text-[10px] mube:text-muted-foreground", children: [c.titulo, " ", i === 0 ? (frame >= 66 && !naCorrecao ? 1 : 0) : i === 1 ? (naCorrecao ? 1 : 0) : 1] }) }, c.titulo))), _jsxs("div", { className: "mube:absolute mube:flex mube:flex-col mube:gap-1 mube:rounded-[8px] mube:bg-card mube:p-2 mube:shadow-soft-3", style: { left: 250, top: 30, width: 96 }, children: [_jsx("span", { className: "mube:truncate mube:text-[10px] mube:text-muted-foreground", children: "LOJA-11" }), _jsx("span", { className: "mube:truncate mube:text-[11px] mube:text-foreground", children: "Fatura em branco" })] }), _jsxs("div", { className: "mube:absolute mube:flex mube:flex-col mube:gap-1 mube:rounded-[8px] mube:bg-card mube:p-2 mube:shadow-soft-4", style: { left: 16 + passa * 117, top: 30 + (1 - cai) * -26, width: 96, opacity: cai, transform: `rotate(${(1 - cai) * -4 + Math.sin(passa * Math.PI) * 3}deg)` }, children: [_jsx("span", { className: "mube:truncate mube:text-[10px] mube:text-muted-foreground", children: "LOJA-13" }), _jsx("span", { className: "mube:truncate mube:text-[11px] mube:text-foreground", children: "O PDF n\u00E3o abre" }), _jsx("span", { className: "mube:origin-left mube:scale-[0.8]", children: _jsx(SeloDeEstado, { estado: naCorrecao ? "correcao" : "relato" }) })] }), _jsxs("div", { className: "mube:absolute mube:flex mube:h-7 mube:items-center mube:gap-1.5 mube:rounded-full mube:bg-primary mube:px-3 mube:text-[11px] mube:text-primary-foreground mube:shadow-soft-3", style: { left: 121, top: 134, opacity: botao, transform: `scale(${1 - clique(frame, 38) * 0.06})` }, children: [_jsx(Icone, { nome: "Plus", tamanho: 11 }), "Reportar um problema"] }), _jsx(Cursor, { x: cursor.x, y: cursor.y, carrega: Math.max(clique(frame, 38), clique(frame, 104)) })] }));
}
// ─── Drive: arrastar um ficheiro para uma pasta ──────────────────────────────
const PASTAS = [
    { nome: "Contratos", x: 70 },
    { nome: "Imagens", x: 181 },
    { nome: "Faturas", x: 292 },
];
export function AnimacaoDrive() {
    const frame = useCurrentFrame();
    const d = DURACAO_DAS_SECOES.drive;
    const arrasta = entre(frame, 40, 92);
    const entra = entre(frame, 92, 104);
    const salta = interpolate(frame, [100, 108, 118], [0, 1, 0], preso);
    const mais = entre(frame, 104, 120, MOLA);
    // O ficheiro vai do canto até ao centro da pasta "Contratos" (o tile está a y 38).
    const ficheiro = { x: interpolate(arrasta, [0, 1], [40, -5]), y: interpolate(arrasta, [0, 1], [116, 21]) };
    const cursor = caminho(frame, [
        [0, 320, 160],
        [26, 90, 133],
        [40, 90, 133],
        [92, 45, 38],
        [120, 45, 38],
        [150, 320, 160],
    ]);
    return (_jsxs(Cena, { frame: frame, duracao: d, children: [PASTAS.map((p, i) => (_jsxs("div", { className: "mube:absolute mube:flex mube:flex-col mube:items-center mube:gap-1.5", style: { left: p.x - 40, top: 16, width: 80 }, children: [_jsx("div", { style: { transform: `translateY(${i === 0 ? salta * -6 : 0}px) scale(${i === 0 ? 1 + salta * 0.08 + arrasta * (1 - entra) * 0.06 : 1})` }, children: _jsx(Tile, { icone: "Folder", tile: i === 0 ? "mube:bg-tile-navy" : "mube:bg-tile-primary", lado: 44 }) }), _jsx("span", { className: "mube:text-[11px] mube:text-foreground", children: p.nome }), _jsx("span", { className: "mube:text-[10px] mube:text-muted-foreground", children: i === 0 ? (frame >= 104 ? "4 ficheiros" : "3 ficheiros") : i === 1 ? "12 ficheiros" : "6 ficheiros" })] }, p.nome))), _jsx(MaisUm, { valor: mais }), _jsxs("div", { className: "mube:absolute mube:flex mube:items-center mube:gap-2 mube:rounded-[10px] mube:bg-card mube:px-2.5 mube:shadow-soft-4", style: { left: ficheiro.x, top: ficheiro.y, width: 150, height: 34, opacity: 1 - entra, transform: `scale(${1 - entra * 0.6}) rotate(${arrasta * (1 - entra) * -3}deg)` }, children: [_jsx(Icone, { nome: "File text", className: "mube:text-muted-foreground" }), _jsx("span", { className: "mube:truncate mube:text-[11px] mube:text-foreground", children: "proposta-final.pdf" })] }), _jsx(Cursor, { x: cursor.x, y: cursor.y, carrega: Math.max(clique(frame, 34) * 0.6, clique(frame, 92)) })] }));
}
/** O "+1" que salta na pasta quando o ficheiro entra. */
function MaisUm({ valor }) {
    return (_jsx("span", { className: "mube:absolute mube:rounded-full mube:bg-status-success mube:px-1.5 mube:text-[10px] mube:text-white", style: { left: 92, top: 10, opacity: valor, transform: `scale(${valor})` }, children: "+1" }));
}
// ─── Credenciais: preencher o pedido, cifrado ────────────────────────────────
export function AnimacaoCredenciais() {
    const frame = useCurrentFrame();
    const d = DURACAO_DAS_SECOES.credenciais;
    const email = "ti@empresa.pt";
    const letras = Math.round(interpolate(frame, [40, 84], [0, email.length], preso));
    const pontos = Math.round(interpolate(frame, [96, 122], [0, 10], preso));
    const envia = clique(frame, 136);
    const formulario = 1 - entre(frame, 142, 154);
    const enviada = entre(frame, 150, 168, MOLA);
    const cursor = caminho(frame, [
        [0, 330, 165],
        [28, 120, 89],
        [88, 120, 89],
        [96, 110, 125],
        [126, 110, 125],
        [134, 300, 125],
        [150, 300, 125],
        [175, 330, 165],
    ]);
    return (_jsxs(Cena, { frame: frame, duracao: d, children: [_jsxs("div", { className: "mube:absolute mube:flex mube:items-center mube:gap-2.5 mube:rounded-[12px] mube:bg-card mube:px-2.5 mube:shadow-soft-3", style: { left: 20, top: 14, width: 322, height: 48 }, children: [_jsx(Tile, { icone: "Globo", tile: "mube:bg-tile-navy", lado: 32 }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsx("span", { className: "mube:text-[12px] mube:text-foreground", children: "Registo do dom\u00EDnio" }), _jsx("span", { className: "mube:text-[10px] mube:text-muted-foreground", children: "Pedido pela equipa da Mube" })] }), _jsxs("span", { className: "mube:relative mube:flex mube:h-5 mube:items-center", children: [_jsxs("span", { className: "mube:flex mube:items-center mube:gap-1 mube:text-[10px] mube:text-muted-foreground", style: { opacity: 1 - enviada }, children: [_jsx("span", { className: "mube:size-1.5 mube:rounded-full mube:bg-status-warning" }), " Por preencher"] }), _jsxs("span", { className: "mube:absolute mube:right-0 mube:flex mube:items-center mube:gap-1 mube:text-[10px] mube:whitespace-nowrap mube:text-status-success", style: { opacity: enviada, transform: `scale(${0.8 + enviada * 0.2})` }, children: [_jsx(Icone, { nome: "Cadeado", tamanho: 11 }), " Enviada, cifrada"] })] })] }), _jsxs("div", { style: { opacity: formulario }, children: [_jsxs("div", { className: "mube:absolute mube:flex mube:items-center mube:rounded-full mube:border mube:border-input mube:bg-card mube:px-3", style: { left: 20, top: 74, width: 322, height: 30 }, children: [_jsx("span", { className: "mube:w-20 mube:text-[10px] mube:text-muted-foreground", children: "Utilizador" }), _jsxs("span", { className: "mube:font-mono mube:text-[11px] mube:text-foreground", children: [email.slice(0, letras), frame >= 30 && frame < 92 && _jsx("span", { style: { opacity: Math.floor(frame / 8) % 2 }, children: "|" })] })] }), _jsxs("div", { className: "mube:absolute mube:flex mube:items-center mube:rounded-full mube:border mube:border-input mube:bg-card mube:px-3", style: { left: 20, top: 110, width: 222, height: 30 }, children: [_jsx("span", { className: "mube:w-20 mube:text-[10px] mube:text-muted-foreground", children: "Senha" }), _jsx("span", { className: "mube:font-mono mube:text-[11px] mube:tracking-widest mube:text-foreground", children: "•".repeat(pontos) })] }), _jsxs("div", { className: "mube:absolute mube:flex mube:items-center mube:justify-center mube:gap-1.5 mube:rounded-full mube:bg-primary mube:text-[11px] mube:text-primary-foreground mube:shadow-soft-3", style: { left: 250, top: 110, width: 92, height: 30, transform: `scale(${1 - envia * 0.06})` }, children: [_jsx(Icone, { nome: "Cadeado", tamanho: 11 }), "Enviar"] })] }), _jsx(Cursor, { x: cursor.x, y: cursor.y, carrega: Math.max(clique(frame, 32), clique(frame, 100), envia) })] }));
}
// ─── Notificações: chegam e lêem-se ──────────────────────────────────────────
const AVISOS = [
    { titulo: "Nova resposta da equipa", texto: "LOJA-12: “Já está corrigido.”", icone: "Comment", tile: "mube:bg-tile-teal" },
    { titulo: "À espera do seu aceite", texto: "LOJA-11 está pronto para validar.", icone: "Check circle", tile: "mube:bg-tile-sepia" },
    { titulo: "A equipa pediu uma credencial", texto: "Registo do domínio", icone: "Key", tile: "mube:bg-tile-navy" },
];
export function AnimacaoNotificacoes() {
    const frame = useCurrentFrame();
    const d = DURACAO_DAS_SECOES.notificacoes;
    const lido = entre(frame, 118, 128);
    const cursor = caminho(frame, [
        [0, 340, 165],
        [100, 300, 37],
        [125, 300, 37],
        [150, 340, 165],
    ]);
    return (_jsxs(Cena, { frame: frame, duracao: d, children: [AVISOS.map((a, i) => {
                // A mais recente fica em cima: chegam de cima, uma a uma.
                const chega = entre(frame, 12 + i * 22, 34 + i * 22, MOLA);
                const y = 14 + (AVISOS.length - 1 - i) * 48;
                const porLer = i === AVISOS.length - 1 ? 1 - lido : 1;
                return (_jsxs("div", { className: `mube:absolute mube:flex mube:items-center mube:gap-2.5 mube:rounded-[12px] mube:px-2.5 mube:shadow-soft-3 ${porLer > 0.5 ? "mube:bg-muted" : "mube:bg-card"}`, style: { left: 31, top: y, width: 300, height: 42, opacity: chega, transform: `translateY(${(1 - chega) * -16}px)` }, children: [_jsx(Tile, { icone: a.icone, tile: a.tile, lado: 28 }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsx("span", { className: "mube:truncate mube:text-[11px] mube:text-foreground", children: a.titulo }), _jsx("span", { className: "mube:truncate mube:text-[10px] mube:text-muted-foreground", children: a.texto })] }), _jsx("span", { className: "mube:size-2 mube:shrink-0 mube:rounded-full mube:bg-primary", style: { opacity: porLer, transform: `scale(${porLer})` } })] }, a.titulo));
            }), _jsx(Cursor, { x: cursor.x, y: cursor.y, carrega: clique(frame, 112) })] }));
}
// ─── Acessos: quem usa o suporte, a Drive e as credenciais ───────────────────
const PESSOAS = ["Ana Ribeiro", "Rui Matos"];
const COLUNAS_DOS_ACESSOS = [
    { titulo: "Suporte", x: 214 },
    { titulo: "Drive", x: 262 },
    { titulo: "Credenciais", x: 318 },
];
/** Quando liga cada interruptor: [pessoa, coluna, frame]. */
const LIGA = [
    [0, 0, 30],
    [0, 1, 56],
    [0, 2, 82],
    [1, 0, 112],
    [1, 1, 136],
];
export function AnimacaoAcessos() {
    const frame = useCurrentFrame();
    const d = DURACAO_DAS_SECOES.acessos;
    const pontos = [[0, 340, 165]];
    for (const [p, c, f] of LIGA)
        pontos.push([f - 12, COLUNAS_DOS_ACESSOS[c].x, 62 + p * 50], [f, COLUNAS_DOS_ACESSOS[c].x, 62 + p * 50]);
    pontos.push([170, 340, 165]);
    const cursor = caminho(frame, pontos);
    return (_jsxs(Cena, { frame: frame, duracao: d, children: [COLUNAS_DOS_ACESSOS.map((c) => (_jsx("span", { className: "mube:absolute mube:-translate-x-1/2 mube:text-[10px] mube:text-muted-foreground", style: { left: c.x, top: 18 }, children: c.titulo }, c.titulo))), PESSOAS.map((nome, p) => (_jsxs("div", { className: "mube:absolute mube:flex mube:items-center mube:gap-2 mube:rounded-[12px] mube:bg-card mube:px-2.5 mube:shadow-soft-3", style: { left: 16, top: 40 + p * 50, width: 330, height: 44 }, children: [_jsx("span", { className: "mube:flex mube:size-7 mube:items-center mube:justify-center mube:rounded-full mube:bg-muted mube:text-[10px] mube:text-muted-foreground", children: nome
                            .split(" ")
                            .map((x) => x[0])
                            .join("") }), _jsx("span", { className: "mube:text-[12px] mube:text-foreground", children: nome })] }, nome))), PESSOAS.map((_, p) => COLUNAS_DOS_ACESSOS.map((c, ci) => {
                const quando = LIGA.find(([pp, cc]) => pp === p && cc === ci)?.[2];
                const ligado = quando === undefined ? 0 : entre(frame, quando, quando + 8);
                return (_jsx("div", { className: `mube:absolute mube:h-[18px] mube:w-[30px] mube:rounded-full ${ligado > 0.5 ? "mube:bg-primary" : "mube:bg-input"}`, style: { left: c.x - 15, top: 53 + p * 50 }, children: _jsx("div", { className: "mube:absolute mube:top-[2px] mube:left-[2px] mube:size-[14px] mube:rounded-full mube:bg-card mube:shadow-soft-2", style: { transform: `translateX(${ligado * 12}px)` } }) }, `${p}-${ci}`));
            })), _jsx(Cursor, { x: cursor.x, y: cursor.y, carrega: Math.max(...LIGA.map(([, , f]) => clique(frame, f - 2))) })] }));
}
