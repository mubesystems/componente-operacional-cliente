import { Lexer } from "marked";
/**
 * O Markdown dos comentários (S74.11): o lexer do `marked` com GFM e uma quebra
 * simples como quebra (S74.2), como no Operacional. Partilhado pela interface
 * (desenhar) e pela parte servidor (o excerto da notificação, S74.13).
 */
export function tokensDoMarkdown(md) {
    return new Lexer({ gfm: true, breaks: true }).lex(md);
}
export const dominioDe = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    }
    catch {
        return url;
    }
};
/** Os links de fora pela ordem, sem repetidos e sem os de dentro de código. */
export function linksDoMarkdown(md) {
    if (!md)
        return [];
    const vistos = new Set();
    const percorrer = (lista) => {
        for (const t of lista ?? []) {
            if (t.type === "code" || t.type === "codespan")
                continue;
            if (t.type === "link") {
                const href = t.href;
                if (/^https?:\/\//i.test(href))
                    vistos.add(href);
                continue;
            }
            percorrer(t.tokens);
            if (t.type === "list")
                for (const item of t.items)
                    percorrer(item.tokens);
        }
    };
    percorrer(tokensDoMarkdown(md));
    return [...vistos];
}
const desescapar = (t) => t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
/** O texto corrido, sem marcas: um link solto conta como o domínio (S74.13). */
export function textoDoMarkdown(md, max) {
    if (!md)
        return "";
    const partes = [];
    const inline = (lista) => {
        for (const t of lista ?? []) {
            if (t.type === "link") {
                const l = t;
                partes.push(l.text === l.href ? dominioDe(l.href) : l.text);
            }
            else if (t.type === "br")
                partes.push(" ");
            else if (t.tokens)
                inline(t.tokens);
            else
                partes.push(t.text ?? "");
        }
    };
    const bloco = (lista) => {
        for (const t of lista) {
            if (t.type === "list")
                for (const item of t.items)
                    bloco(item.tokens);
            else if (t.type === "blockquote")
                bloco(t.tokens);
            else if (t.type === "code")
                partes.push(t.text);
            else if (t.tokens)
                inline(t.tokens);
            else if (t.text)
                partes.push(t.text);
            partes.push(" ");
        }
    };
    bloco(tokensDoMarkdown(md));
    const texto = desescapar(partes.join("")).replace(/\s+/g, " ").trim();
    return max && texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto;
}
export { desescapar };
