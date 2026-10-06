"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId } from "react";
// As mesmas famílias do operacional (components/ui/ficheiro.tsx): a família dá a cor, a extensão dá o rótulo.
const FAMILIAS = {
    pdf: { cor: "mube:fill-status-error", rotulo: "PDF", extensoes: ["pdf"] },
    documento: { cor: "mube:fill-chart-5", rotulo: "DOC", extensoes: ["doc", "docx", "docm", "dot", "dotx", "odt", "rtf", "pages"] },
    folha: { cor: "mube:fill-status-success", rotulo: "XLS", extensoes: ["xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "ods", "numbers", "csv", "tsv"] },
    apresentacao: { cor: "mube:fill-[var(--scale-terracotta-600)]", rotulo: "PPT", extensoes: ["ppt", "pptx", "pptm", "pps", "ppsx", "odp", "key"] },
    texto: { cor: "mube:fill-[var(--scale-sepia-600)]", rotulo: "TXT", extensoes: ["txt", "md", "markdown", "log", "text", "srt", "vtt"] },
    codigo: {
        cor: "mube:fill-[var(--scale-violet-600)]",
        rotulo: "CODE",
        extensoes: ["js", "jsx", "ts", "tsx", "mjs", "cjs", "py", "rb", "php", "java", "kt", "go", "rs", "c", "h", "cpp", "cs", "swift", "sh", "html", "htm", "css", "scss", "vue", "svelte"],
    },
    dados: { cor: "mube:fill-chart-3", rotulo: "DATA", extensoes: ["json", "xml", "yml", "yaml", "toml", "ini", "env", "sql", "graphql"] },
    imagem: { cor: "mube:fill-chart-4", rotulo: "IMG", extensoes: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "svg", "bmp", "tif", "tiff", "avif", "ico"] },
    video: { cor: "mube:fill-chart-2", rotulo: "VID", extensoes: ["mp4", "mov", "webm", "m4v", "avi", "mkv"] },
    audio: { cor: "mube:fill-[var(--scale-indigo-600)]", rotulo: "AUD", extensoes: ["mp3", "m4a", "wav", "ogg", "oga", "aac", "flac", "opus"] },
    compactado: { cor: "mube:fill-primary", rotulo: "ZIP", extensoes: ["zip", "rar", "7z", "gz", "tgz", "tar", "bz2", "xz"] },
    outro: { cor: "mube:fill-[var(--scale-neutral-600)]", rotulo: "ARQ", extensoes: [] },
};
const POR_EXTENSAO = new Map(Object.entries(FAMILIAS).flatMap(([f, d]) => d.extensoes.map((e) => [e, f])));
const extensao = (nome) => {
    const i = nome.lastIndexOf(".");
    return i > 0 ? nome.slice(i + 1).toLowerCase() : "";
};
function familia(nome, tipoMime) {
    const m = tipoMime ?? "";
    // O áudio gravado no navegador é .webm, como o vídeo: o tipo MIME desempata.
    if (m.startsWith("audio/"))
        return "audio";
    const porExtensao = POR_EXTENSAO.get(extensao(nome));
    if (porExtensao)
        return porExtensao;
    if (m === "application/pdf")
        return "pdf";
    if (m.startsWith("image/"))
        return "imagem";
    if (m.startsWith("video/"))
        return "video";
    if (m.startsWith("text/"))
        return "texto";
    return "outro";
}
/** O rótulo do ícone: a extensão (até 4 letras) ou o da família. Áudio gravado (.webm) mostra MP3, como antes. */
export function tipoDoFicheiro(nome, tipoMime) {
    const f = familia(nome, tipoMime);
    if (f === "audio" && extensao(nome) === "webm")
        return "MP3";
    const e = extensao(nome);
    return f !== "outro" && e.length >= 2 && e.length <= 4 ? e.toUpperCase() : FAMILIAS[f].rotulo;
}
/** Figma: Folder & File / File. Tamanhos sm 40, md 72, lg 96. */
export function Ficheiro({ nome, tipoMime, tamanho = 40 }) {
    const t = tipoDoFicheiro(nome, tipoMime);
    const cor = FAMILIAS[familia(nome, tipoMime)].cor;
    const s = tamanho;
    return (_jsxs("span", { "aria-hidden": true, className: "mube:relative mube:block mube:shrink-0", style: { width: s, height: s, filter: `drop-shadow(0 ${s * 0.0375}px ${s * 0.0375}px rgb(0 0 0 / 0.12))` }, children: [_jsx("svg", { viewBox: "0 0 33.6 42", className: "mube:absolute mube:top-0", style: { left: s * 0.1, width: s * 0.8, height: s }, children: _jsx("path", { d: "M5.8485 0H21L33.6 12.6V36.5295C33.6 39.5535 30.9855 42 27.762 42H5.8485C2.6145 42 0 39.5535 0 36.5295V5.4705C0 2.4465 2.6145 0 5.8485 0Z", className: cor }) }), _jsx("svg", { viewBox: "0 0 12.6 12.6", className: "mube:absolute mube:top-0", style: { left: s * 0.6, width: s * 0.3, height: s * 0.3 }, children: _jsx("path", { d: "M0 0V8.568C0 9.9435 0.441 12.6 4.221 12.6C7.9905 12.6 11.382 12.6 12.6 12.6L0 0Z", fill: "white", fillOpacity: "0.35" }) }), _jsx("span", { className: "mube:absolute mube:text-center mube:leading-none mube:font-extrabold mube:text-white", style: { top: s * 0.575, left: s * 0.1, width: s * 0.8, fontSize: s * (t.length > 3 ? 0.1875 : 0.225) }, children: t })] }));
}
const FUNDO = "M4.07149 22.2936H23.6987C24.814 22.2936 25.3719 22.2936 25.7978 22.0765C26.1723 21.8856 26.4771 21.5808 26.668 21.2063C26.8851 20.7804 26.8851 20.2225 26.8851 19.1072V5.67574C26.8851 4.56051 26.8851 4.00262 26.668 3.57666C26.4771 3.20215 26.1723 2.89734 25.7978 2.70649C25.3719 2.48936 24.814 2.48936 23.6987 2.48936H12.9309C12.3362 2.48936 11.5755 2.43404 10.8287 1.86702C10.0819 1.3 10.7181 1.78404 9.92979 1.17553C9.14149 0.567021 8.7396 0.442553 8.04894 0.442553H4.07149C2.95626 0.442553 2.39836 0.442553 1.9724 0.659681C1.59789 0.850532 1.29309 1.15534 1.10223 1.52985C0.885106 1.95581 0.885106 2.5137 0.885106 3.62894V19.1072C0.885106 20.2225 0.885106 20.7804 1.10223 21.2063C1.29309 21.5808 1.59789 21.8856 1.9724 22.0765C2.39836 22.2936 2.95626 22.2936 4.07149 22.2936Z";
/** Figma: Folder & File / Folder, na cor neutra do Embed (identidade neutra, K2). */
export function Pasta({ largura = 52 }) {
    const id = useId().replace(/:/g, "");
    const cor = (tom) => `var(--scale-neutral-${tom})`;
    return (_jsx("span", { "aria-hidden": true, className: "mube:relative mube:block mube:shrink-0", style: { width: largura, height: (largura * 21.851) / 26 }, children: _jsxs("svg", { viewBox: "0 0 27.7702 23.6213", fill: "none", className: "mube:absolute mube:block mube:max-w-none", style: { left: "-3.4%", top: "-2.03%", width: "106.8%", height: "108.11%" }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: `${id}t`, x1: "13.8851", y1: "0.442553", x2: "13.8851", y2: "22.2936", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { style: { stopColor: cor(400) } }), _jsx("stop", { offset: "0.229", style: { stopColor: cor(500) } })] }), _jsxs("linearGradient", { id: `${id}f`, x1: "13.8851", y1: "4.14894", x2: "13.8851", y2: "22.2936", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { style: { stopColor: cor(300) } }), _jsx("stop", { offset: "1", style: { stopColor: cor(400) } })] }), _jsxs("filter", { id: `${id}s`, x: "0", y: "0", width: "27.7702", height: "23.6213", filterUnits: "userSpaceOnUse", children: [_jsx("feDropShadow", { dx: "0", dy: "0.44", stdDeviation: "0.44", floodOpacity: "0.1" }), _jsx("feDropShadow", { dx: "0", dy: "0.22", stdDeviation: "0.22", floodOpacity: "0.18" })] }), _jsx("filter", { id: `${id}r`, x: "-0.885106", y: "1.93617", width: "29.5404", height: "21.6851", filterUnits: "userSpaceOnUse", children: _jsx("feDropShadow", { dx: "0", dy: "-0.44", stdDeviation: "0.885", floodOpacity: "0.45", style: { floodColor: cor(500) } }) }), _jsx("mask", { id: `${id}m`, maskUnits: "userSpaceOnUse", x: "0", y: "0", width: "27", height: "23", style: { maskType: "alpha" }, children: _jsx("path", { d: FUNDO, fill: "white" }) })] }), _jsx("g", { filter: `url(#${id}s)`, children: _jsxs("g", { mask: `url(#${id}m)`, children: [_jsx("path", { d: FUNDO, fill: `url(#${id}t)` }), _jsx("rect", { x: "0.885106", y: "4.14894", width: "26", height: "18.1447", rx: "1.99149", fill: `url(#${id}f)`, filter: `url(#${id}r)` }), _jsx("rect", { x: "0.885106", y: "19.583", width: "26", height: "0.497872", fill: "white", fillOpacity: "0.1" }), _jsx("rect", { x: "0.885106", y: "20.6064", width: "26", height: "0.497872", fill: "white", fillOpacity: "0.1" })] }) })] }) }));
}
