import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { desescapar, dominioDe, linksDoMarkdown, tokensDoMarkdown } from "../markdown.js";
import { Icone } from "./ui.js";
const OPERACIONAL = /^https?:\/\/(operacional\.mubesystems\.com|localhost:3004)(\/|$)/i;
function caminhoCurto(url) {
    try {
        const u = new URL(url);
        const c = `${u.pathname}${u.search}`;
        if (c === "/" || !c)
            return "";
        return c.length > 22 ? `${c.slice(0, 20)}…` : c;
    }
    catch {
        return "";
    }
}
function IconeDoSite({ src, escuro }) {
    const [falhou, setFalhou] = useState(false);
    if (!src || falhou)
        return _jsx(Icone, { nome: "Globo", tamanho: 13, className: escuro ? "mube:opacity-80" : "mube:text-muted-foreground" });
    // eslint-disable-next-line @next/next/no-img-element -- imagem de outro site
    return _jsx("img", { src: src, alt: "", referrerPolicy: "no-referrer", loading: "lazy", onError: () => setFalhou(true), className: "mube:size-4 mube:shrink-0 mube:rounded-full mube:bg-card mube:object-cover" });
}
function Chip({ url, ctx }) {
    const p = ctx.links[url];
    const cor = ctx.escuro
        ? "mube:border-primary-foreground/25 mube:bg-primary-foreground/10 mube:text-primary-foreground"
        : "mube:border-border mube:bg-card mube:text-foreground";
    return (_jsxs("a", { href: url, target: "_blank", rel: "noreferrer", className: `mube:mx-px mube:inline-flex mube:h-[22px] mube:max-w-full mube:translate-y-[3px] mube:items-center mube:gap-1.5 mube:rounded-full mube:border mube:py-0 mube:pr-2 mube:pl-1 mube:align-baseline mube:text-label-sm mube:leading-none mube:no-underline ${cor}`, children: [_jsx(IconeDoSite, { src: p?.icone ?? null, escuro: ctx.escuro }), _jsx("span", { className: "mube:min-w-0 mube:truncate", children: p?.titulo ?? (_jsxs(_Fragment, { children: [dominioDe(url), _jsx("span", { className: "mube:font-normal mube:opacity-70", children: caminhoCurto(url) })] })) })] }));
}
/** O texto com as menções destacadas; a menção a quem está a ler, mais forte. */
function ComMencoes({ texto, ctx }) {
    const nomes = ctx.mencoes.filter((m) => m.nome && texto.includes(`@${m.nome}`)).sort((a, b) => b.nome.length - a.nome.length);
    if (!nomes.length)
        return _jsx(_Fragment, { children: texto });
    const escapar = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const porNome = new Map(nomes.map((m) => [`@${m.nome}`, m]));
    const partes = texto.split(new RegExp(`(@(?:${nomes.map((m) => escapar(m.nome)).join("|")}))`, "g"));
    return (_jsx(_Fragment, { children: partes.map((parte, i) => {
            const m = porNome.get(parte);
            if (!m)
                return parte;
            const eu = m.id === ctx.euId;
            return (_jsx("span", { className: `mube:rounded mube:px-0.5 mube:font-semibold ${eu ? "mube:bg-status-info/15 mube:text-status-info" : ctx.escuro ? "" : "mube:text-status-info"}`, children: parte }, i));
        }) }));
}
function inline(lista, ctx) {
    return (lista ?? []).map((t, i) => {
        switch (t.type) {
            case "strong":
                return (_jsx("strong", { className: "mube:font-semibold", children: inline(t.tokens, ctx) }, i));
            case "em":
                return _jsx("em", { children: inline(t.tokens, ctx) }, i);
            case "del":
                return _jsx("del", { children: inline(t.tokens, ctx) }, i);
            case "codespan":
                return (_jsx("code", { className: `mube:rounded-md mube:px-1 mube:py-px mube:font-mono mube:text-[0.875em] ${ctx.escuro ? "mube:bg-primary-foreground/15" : "mube:bg-card/70"}`, children: desescapar(t.text) }, i));
            case "br":
                return _jsx("br", {}, i);
            case "link": {
                const l = t;
                // Os links do Operacional não abrem no software do cliente: fica o texto.
                if (OPERACIONAL.test(l.href) || l.href.startsWith("/"))
                    return _jsx("span", { children: l.text === l.href ? l.href : inline(l.tokens, ctx) }, i);
                if (!/^https?:\/\//i.test(l.href))
                    return _jsx("span", { children: inline(l.tokens, ctx) }, i);
                if (l.text === l.href || l.raw === l.href || l.raw === `<${l.href}>`)
                    return _jsx(Chip, { url: l.href, ctx: ctx }, i);
                return (_jsx("a", { href: l.href, target: "_blank", rel: "noreferrer", className: "mube:underline mube:underline-offset-2", children: inline(l.tokens, ctx) }, i));
            }
            case "image":
                return _jsx("span", { children: t.text }, i);
            case "text": {
                const filhos = t.tokens;
                if (filhos?.length)
                    return _jsx("span", { children: inline(filhos, ctx) }, i);
                return _jsx(ComMencoes, { texto: desescapar(t.text), ctx: ctx }, i);
            }
            default:
                return _jsx("span", { children: desescapar(t.text ?? t.raw ?? "") }, i);
        }
    });
}
function blocos(lista, ctx) {
    return lista.map((t, i) => {
        switch (t.type) {
            case "space":
                return null;
            case "paragraph":
                return _jsx("p", { children: inline(t.tokens, ctx) }, i);
            case "heading":
                return (_jsx("p", { className: "mube:font-semibold", children: inline(t.tokens, ctx) }, i));
            case "list": {
                const l = t;
                const itens = l.items.map((item, j) => _jsx("li", { children: blocos(item.tokens, ctx) }, j));
                return l.ordered ? (_jsx("ol", { start: typeof l.start === "number" ? l.start : undefined, className: "mube:list-decimal mube:pl-5", children: itens }, i)) : (_jsx("ul", { className: "mube:list-disc mube:pl-5", children: itens }, i));
            }
            case "blockquote":
                return (_jsx("blockquote", { className: "mube:border-l-2 mube:border-current/30 mube:pl-3 mube:opacity-80", children: blocos(t.tokens, ctx) }, i));
            case "code":
                return (_jsx("pre", { className: `mube:overflow-x-auto mube:rounded-lg mube:px-2.5 mube:py-2 mube:font-mono mube:text-[0.8125rem] ${ctx.escuro ? "mube:bg-primary-foreground/10" : "mube:bg-card/70"}`, children: _jsx("code", { children: t.text }) }, i));
            case "hr":
                return _jsx("hr", { className: "mube:border-current/20" }, i);
            case "text": {
                // Itens de lista "apertados": o texto vem como bloco com filhos inline.
                const filhos = t.tokens;
                return _jsx("span", { children: filhos?.length ? inline(filhos, ctx) : desescapar(t.text) }, i);
            }
            default:
                return (_jsx("p", { className: "mube:whitespace-pre-wrap", children: desescapar(t.raw ?? "") }, i));
        }
    });
}
export function Markdown({ texto, links = {}, mencoes = [], euId, escuro = false, }) {
    const ctx = { links, mencoes, euId, escuro };
    return _jsx("div", { className: "mube:flex mube:flex-col mube:gap-1.5 mube:text-body-sm mube:break-words", children: blocos(tokensDoMarkdown(texto), ctx) });
}
function Cartao({ url, p }) {
    const [semImagem, setSemImagem] = useState(false);
    return (_jsxs("a", { href: url, target: "_blank", rel: "noreferrer", className: "mube:flex mube:min-h-[76px] mube:overflow-hidden mube:rounded-xl mube:border mube:border-border mube:bg-card mube:text-foreground mube:no-underline", children: [_jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col mube:gap-0.5 mube:px-2.5 mube:py-2", children: [_jsxs("span", { className: "mube:flex mube:min-w-0 mube:items-center mube:gap-1.5 mube:text-body-xs mube:text-muted-foreground", children: [_jsx(IconeDoSite, { src: p.icone, escuro: false }), _jsx("span", { className: "mube:truncate", children: p.dominio })] }), _jsx("span", { className: "mube:line-clamp-2 mube:text-label-strong", children: p.titulo }), p.descricao ? (_jsx("span", { className: "mube:line-clamp-2 mube:text-body-xs mube:text-muted-foreground", children: p.descricao })) : (p.video && _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: "V\u00EDdeo" }))] }), p.imagem && !semImagem && (_jsxs("span", { className: "mube:relative mube:flex mube:w-[76px] mube:shrink-0 mube:items-center mube:justify-center mube:overflow-hidden mube:bg-muted", children: [_jsx("img", { src: p.imagem, alt: "", referrerPolicy: "no-referrer", loading: "lazy", onError: () => setSemImagem(true), className: "mube:absolute mube:inset-0 mube:size-full mube:object-cover" }), p.video && (_jsx("span", { className: "mube:relative mube:flex mube:size-6 mube:items-center mube:justify-center mube:rounded-full mube:bg-card/95 mube:text-foreground", children: _jsx(Icone, { nome: "Play", tamanho: 12 }) }))] }))] }));
}
const MAX_CARTOES = 3;
/** Os cartões dos links de fora por baixo do texto (S74.6): até 3, e "Mostrar mais N". */
export function CartoesDosLinks({ texto, links = {} }) {
    const [todos, setTodos] = useState(false);
    const lista = linksDoMarkdown(texto)
        .filter((u) => !OPERACIONAL.test(u) && links[u]?.titulo)
        .map((u) => ({ url: u, p: links[u] }));
    if (!lista.length)
        return null;
    const vistos = todos ? lista : lista.slice(0, MAX_CARTOES);
    const resto = lista.length - vistos.length;
    return (_jsxs("div", { className: "mube:flex mube:w-full mube:flex-col mube:gap-1.5", children: [vistos.map((c) => (_jsx(Cartao, { url: c.url, p: c.p }, c.url))), resto > 0 && (_jsxs("button", { type: "button", onClick: () => setTodos(true), className: "mube:flex mube:h-7 mube:w-fit mube:items-center mube:gap-1.5 mube:rounded-full mube:border mube:border-border mube:bg-card mube:px-2.5 mube:text-label-sm mube:text-foreground", children: [_jsx(Icone, { nome: "Link", tamanho: 13 }), "Mostrar mais ", resto, " ", resto === 1 ? "pré-visualização" : "pré-visualizações"] }))] }));
}
