"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef } from "react";
import { ICONES } from "../gerado/icones.js";
export function Icone({ nome, tamanho = 16, className = "", rotulo }) {
    return (_jsx("svg", { width: tamanho, height: tamanho, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: `mube:shrink-0 ${className}`, role: rotulo ? "img" : undefined, "aria-label": rotulo, "aria-hidden": rotulo ? undefined : true, dangerouslySetInnerHTML: { __html: ICONES[nome] } }));
}
// ─── Botão (Figma: Button; pílula, sm 32 / md 40 / lg 48) ────────────────────
const ESTILO = {
    primario: "mube:bg-primary mube:text-primary-foreground mube:hover:bg-primary-hover mube:disabled:bg-muted mube:disabled:text-muted-foreground",
    secundario: "mube:border mube:border-input mube:bg-card mube:text-foreground mube:hover:bg-muted mube:disabled:text-muted-foreground",
    fantasma: "mube:text-foreground mube:hover:bg-muted mube:disabled:text-muted-foreground",
    destrutivo: "mube:bg-destructive mube:text-destructive-foreground mube:hover:bg-destructive-hover",
};
const TAMANHO = { sm: "mube:h-8 mube:px-3 mube:text-label-sm", md: "mube:h-10 mube:px-4 mube:text-label", lg: "mube:h-12 mube:px-5 mube:text-label" };
export function Botao({ estilo = "primario", tamanho = "md", icone, aCarregar, className = "", children, ...resto }) {
    return (_jsxs("button", { type: "button", ...resto, disabled: resto.disabled || aCarregar, className: `mube:inline-flex mube:items-center mube:justify-center mube:gap-2 mube:rounded-full mube:whitespace-nowrap mube:transition-colors mube:duration-200 mube:focus-visible:shadow-focus ${ESTILO[estilo]} ${TAMANHO[tamanho]} ${className}`, children: [aCarregar ? _jsx(Rodinha, {}) : icone && _jsx(Icone, { nome: icone }), children] }));
}
export function BotaoIcone({ icone, rotulo, onClick, className = "" }) {
    return (_jsx("button", { type: "button", "aria-label": rotulo, title: rotulo, onClick: onClick, className: `mube:flex mube:size-8 mube:items-center mube:justify-center mube:rounded-full mube:text-muted-foreground mube:transition-colors mube:duration-150 mube:hover:bg-muted mube:hover:text-foreground mube:focus-visible:shadow-focus ${className}`, children: _jsx(Icone, { nome: icone }) }));
}
export function Rodinha() {
    return _jsx("span", { "aria-hidden": true, className: "mube:size-4 mube:shrink-0 mube:animate-spin mube:rounded-full mube:border-2 mube:border-current mube:border-t-transparent" });
}
// ─── Selo de estado (Figma: Badge · State) ───────────────────────────────────
const ESTADO = {
    relato: { rotulo: "Relato", classe: "mube:bg-state-relato-bg mube:text-state-relato-fg" },
    triagem: { rotulo: "Triagem", classe: "mube:bg-state-triagem-bg mube:text-state-triagem-fg" },
    contencao: { rotulo: "Contenção", classe: "mube:bg-state-contencao-bg mube:text-state-contencao-fg" },
    correcao: { rotulo: "Correção", classe: "mube:bg-state-correcao-bg mube:text-state-correcao-fg" },
    em_validacao: { rotulo: "Em Validação", classe: "mube:bg-state-em-validacao-bg mube:text-state-em-validacao-fg" },
    aguardando_aceite: { rotulo: "Aguardando Aceite", classe: "mube:bg-state-aguardando-aceite-bg mube:text-state-aguardando-aceite-fg" },
    concluida: { rotulo: "Concluída", classe: "mube:bg-state-concluida-bg mube:text-state-concluida-fg" },
    // N19: o cliente vê "Encerrado", nunca a categoria interna.
    descartada: { rotulo: "Encerrado", classe: "mube:bg-state-descartada-bg mube:text-state-descartada-fg mube:border mube:border-border" },
};
export const ESTADOS_EM_ORDEM = ["relato", "triagem", "contencao", "correcao", "em_validacao", "aguardando_aceite", "concluida", "descartada"];
export const rotuloDoEstado = (e) => ESTADO[e]?.rotulo ?? e;
export function SeloDeEstado({ estado }) {
    const s = ESTADO[estado] ?? ESTADO.relato;
    return _jsx("span", { className: `mube:inline-flex mube:h-5 mube:shrink-0 mube:items-center mube:rounded-full mube:px-2 mube:text-label-sm mube:whitespace-nowrap ${s.classe}`, children: s.rotulo });
}
const PRIORIDADE = {
    urgente: "mube:text-priority-urgente-fg mube:bg-priority-urgente-bg",
    alta: "mube:text-priority-alta-fg mube:bg-priority-alta-bg",
    media: "mube:text-priority-media-fg mube:bg-priority-media-bg",
    baixa: "mube:text-priority-baixa-fg mube:bg-priority-baixa-bg",
};
export function SeloDePrioridade({ valor, rotulo }) {
    return _jsx("span", { className: `mube:inline-flex mube:h-5 mube:items-center mube:rounded-full mube:px-2 mube:text-label-sm ${PRIORIDADE[valor] ?? PRIORIDADE.baixa}`, children: rotulo });
}
// ─── Janela (Figma: Modal no desktop, sheet no telemóvel) ────────────────────
export function Janela({ titulo, descricao, aoFechar, rodape, largura = "mube:md:w-[512px]", children, }) {
    const id = useId();
    const caixa = useRef(null);
    useEffect(() => {
        const antes = document.activeElement;
        caixa.current?.querySelector("textarea, input, button[data-principal]")?.focus();
        const tecla = (e) => {
            if (e.key !== "Escape")
                return;
            e.stopPropagation();
            aoFechar();
        };
        document.addEventListener("keydown", tecla, true);
        return () => {
            document.removeEventListener("keydown", tecla, true);
            antes?.focus?.();
        };
    }, [aoFechar]);
    return (_jsx("div", { className: "mube:fixed mube:inset-0 mube:z-[2147483002] mube:flex mube:items-end mube:justify-center mube:bg-black/40 mube:md:items-center", onMouseDown: (e) => e.target === e.currentTarget && aoFechar(), children: _jsxs("div", { ref: caixa, role: "dialog", "aria-modal": "true", "aria-labelledby": `${id}-t`, className: `mube:flex mube:max-h-[92dvh] mube:w-full mube:flex-col mube:overflow-hidden mube:rounded-t-[20px] mube:bg-card mube:shadow-soft-6 mube:animar-entrar mube:md:rounded-[20px] ${largura}`, children: [_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1 mube:px-5 mube:pt-5", children: [_jsx("h2", { id: `${id}-t`, className: "mube:text-h4 mube:text-foreground", children: titulo }), descricao && _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: descricao })] }), _jsx("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col mube:gap-3 mube:overflow-y-auto mube:px-5 mube:py-4", children: children }), rodape && _jsx("div", { className: "mube:flex mube:flex-col-reverse mube:gap-2 mube:px-5 mube:pb-5 mube:md:flex-row mube:md:justify-end", children: rodape })] }) }));
}
// ─── Vazio, erro e a carregar (Figma: Feedback) ──────────────────────────────
export function Vazio({ icone, titulo, texto, acao }) {
    return (_jsxs("div", { className: "mube:flex mube:flex-1 mube:flex-col mube:items-center mube:justify-center mube:gap-2 mube:px-6 mube:py-12 mube:text-center mube:animar-entrar", children: [_jsx("span", { className: "mube:mb-1 mube:flex mube:size-10 mube:items-center mube:justify-center mube:rounded-xl mube:bg-muted mube:text-muted-foreground", children: _jsx(Icone, { nome: icone, tamanho: 20 }) }), _jsx("p", { className: "mube:text-label-strong mube:text-foreground", children: titulo }), texto && _jsx("p", { className: "mube:max-w-sm mube:text-body-sm mube:text-muted-foreground", children: texto }), acao && _jsx("div", { className: "mube:mt-2", children: acao })] }));
}
export function ErroAoCarregar({ texto, aoTentar }) {
    return (_jsx(Vazio, { icone: "Alert", titulo: "N\u00E3o foi poss\u00EDvel carregar", texto: texto, acao: _jsx(Botao, { estilo: "secundario", icone: "Refresh", onClick: aoTentar, children: "Tentar de novo" }) }));
}
export function Esqueleto({ className = "" }) {
    return _jsx("span", { "aria-hidden": true, className: `mube:block mube:rounded-md mube:bg-muted mube:animar-pulso ${className}` });
}
// ─── Datas e tamanhos (pt-PT, à hora de Lisboa) ──────────────────────────────
// "long" e cortar a 3 letras, como o Operacional: o "short" do pt-PT dá "4/10" nalguns navegadores.
const DIA = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", timeZone: "Europe/Lisbon" });
const HORA = new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/Lisbon" });
/** "26 set" (as partes, para não depender de como o navegador junta dia e mês). */
export function dia(iso) {
    const partes = DIA.formatToParts(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
    const d = partes.find((p) => p.type === "day")?.value ?? "";
    const m = (partes.find((p) => p.type === "month")?.value ?? "").replace(".", "").slice(0, 3);
    return `${d} ${m}`;
}
export const diaEHora = (iso) => `${dia(iso)}, ${HORA.format(new Date(iso))}`;
export function haQuanto(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60)
        return "agora";
    if (s < 3600)
        return `há ${Math.floor(s / 60)} min`;
    if (s < 86400)
        return `há ${Math.floor(s / 3600)} h`;
    if (s < 172800)
        return "ontem";
    return dia(iso);
}
export function tamanho(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 ** 3)
        return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
    return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
}
