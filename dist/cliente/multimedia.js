"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Ficheiro } from "./ficheiros.js";
import { Icone, tamanho } from "./ui.js";
/*
 * Imagens, áudio e vídeo dos anexos (Figma: Player / Audio e Player / Video),
 * portados de apps/operacional/components/tickets/leitor.tsx e lightbox.tsx.
 */
const VELOCIDADES = [1, 1.5, 2];
const tempo = (s) => (Number.isFinite(s) ? `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--");
export const tipoDeMedia = (mime) => (mime.startsWith("image/") ? "imagem" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : null);
/** Leitor de áudio e vídeo: play, tempo, barra (também pelas setas) e velocidade. */
export function Leitor({ url, tipo, nome, grande, aoAmpliar }) {
    const media = useRef(null);
    const [aTocar, setATocar] = useState(false);
    const [atual, setAtual] = useState(0);
    const [duracao, setDuracao] = useState(Number.NaN);
    const [velocidade, setVelocidade] = useState(1);
    // O áudio gravado no navegador (webm) chega sem duração: salta-se ao fim para a descobrir.
    const aDescobrir = useRef(false);
    function alternar() {
        const m = media.current;
        if (!m)
            return;
        if (m.paused)
            void m.play();
        else
            m.pause();
    }
    function irPara(s) {
        const m = media.current;
        if (!m || !Number.isFinite(m.duration))
            return;
        m.currentTime = Math.min(Math.max(0, s), m.duration);
    }
    function lerDuracao() {
        const m = media.current;
        if (!m)
            return;
        if (m.duration === Infinity && !aDescobrir.current) {
            aDescobrir.current = true;
            m.currentTime = 1e101;
            return;
        }
        setDuracao(m.duration);
    }
    const comum = {
        ref: media,
        src: url,
        preload: "metadata",
        onPlay: () => setATocar(true),
        onPause: () => setATocar(false),
        onEnded: () => setATocar(false),
        onTimeUpdate: () => {
            const m = media.current;
            if (!m)
                return;
            if (aDescobrir.current && Number.isFinite(m.duration)) {
                aDescobrir.current = false;
                m.currentTime = 0;
                setDuracao(m.duration);
                return;
            }
            setAtual(m.currentTime);
        },
        onLoadedMetadata: lerDuracao,
        onDurationChange: () => Number.isFinite(media.current?.duration) && setDuracao(media.current.duration),
    };
    const progresso = Number.isFinite(duracao) && duracao > 0 ? (atual / duracao) * 100 : 0;
    return (_jsxs("div", { className: "mube:flex mube:w-full mube:flex-col mube:gap-3 mube:rounded-xl mube:border mube:border-border mube:bg-card mube:p-3", children: [tipo === "video" ? (_jsxs("div", { className: `mube:relative mube:flex mube:items-center mube:justify-center mube:overflow-hidden mube:rounded-lg mube:bg-foreground ${grande ? "mube:h-[min(70dvh,640px)]" : "mube:h-48"}`, children: [_jsx("video", { ...comum, playsInline: true, className: "mube:size-full mube:object-contain", onClick: alternar }), aoAmpliar && (_jsx("button", { type: "button", onClick: () => {
                            media.current?.pause();
                            aoAmpliar();
                        }, "aria-label": `Ampliar ${nome}`, className: "mube:absolute mube:top-2 mube:right-2 mube:flex mube:size-8 mube:items-center mube:justify-center mube:rounded-full mube:bg-black/50 mube:text-white mube:hover:bg-black/70", children: _jsx(Icone, { nome: "View" }) })), !aTocar && (_jsx("button", { type: "button", onClick: alternar, "aria-label": `Reproduzir ${nome}`, className: "mube:absolute mube:flex mube:size-12 mube:items-center mube:justify-center mube:rounded-full mube:bg-white mube:text-black mube:shadow-soft-3 mube:transition-transform mube:duration-200 mube:hover:scale-105", children: _jsx(Icone, { nome: "Play" }) }))] })) : (_jsx("audio", { ...comum, className: "mube:hidden" })), _jsxs("div", { className: "mube:flex mube:items-center mube:gap-2.5", children: [_jsx("button", { type: "button", onClick: alternar, "aria-label": aTocar ? `Pausar ${nome}` : `Reproduzir ${nome}`, className: "mube:flex mube:size-9 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary mube:text-primary-foreground mube:transition-colors mube:hover:bg-primary-hover", children: _jsx(Icone, { nome: aTocar ? "Pause" : "Play" }) }), _jsx("span", { className: "mube:font-mono mube:text-mono-sm mube:text-foreground mube:tabular-nums", children: tempo(atual) }), _jsx("div", { role: "slider", tabIndex: 0, "aria-label": `Posição em ${nome}`, "aria-valuemin": 0, "aria-valuemax": Number.isFinite(duracao) ? Math.round(duracao) : 0, "aria-valuenow": Math.round(atual), "aria-valuetext": `${tempo(atual)} de ${tempo(duracao)}`, onKeyDown: (e) => {
                            if (e.key === "ArrowRight")
                                irPara(atual + 5);
                            if (e.key === "ArrowLeft")
                                irPara(atual - 5);
                        }, onClick: (e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            if (Number.isFinite(duracao))
                                irPara(((e.clientX - r.left) / r.width) * duracao);
                        }, className: "mube:relative mube:h-1.5 mube:min-w-0 mube:flex-1 mube:cursor-pointer mube:overflow-hidden mube:rounded-full mube:bg-muted mube:focus-visible:shadow-focus", children: _jsx("span", { className: "mube:absolute mube:inset-y-0 mube:left-0 mube:rounded-full mube:bg-primary", style: { width: `${progresso}%` } }) }), _jsx("span", { className: "mube:font-mono mube:text-mono-sm mube:text-muted-foreground mube:tabular-nums", children: tempo(duracao) }), _jsxs("button", { type: "button", onClick: () => {
                            const proxima = VELOCIDADES[(VELOCIDADES.indexOf(velocidade) + 1) % VELOCIDADES.length];
                            setVelocidade(proxima);
                            if (media.current)
                                media.current.playbackRate = proxima;
                        }, "aria-label": `Velocidade ${velocidade}×`, className: "mube:flex mube:h-7 mube:shrink-0 mube:items-center mube:rounded-lg mube:border mube:border-input mube:bg-card mube:px-2 mube:text-label-sm mube:text-foreground mube:hover:bg-muted", children: [String(velocidade).replace(".", ","), "\u00D7"] })] })] }));
}
/** Imagens e vídeos em grande, com setas e teclado (← → Esc). */
function Lightbox({ itens, indice, aoMudar, aoFechar }) {
    const fechar = useRef(null);
    const total = itens.length;
    useEffect(() => {
        fechar.current?.focus();
        const tecla = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                aoFechar();
            }
            if (e.key === "ArrowRight" && total > 1)
                aoMudar((indice + 1) % total);
            if (e.key === "ArrowLeft" && total > 1)
                aoMudar((indice - 1 + total) % total);
        };
        document.addEventListener("keydown", tecla, true);
        return () => document.removeEventListener("keydown", tecla, true);
    }, [indice, total, aoMudar, aoFechar]);
    const a = itens[indice];
    const seta = "mube:absolute mube:top-1/2 mube:flex mube:size-11 mube:-translate-y-1/2 mube:items-center mube:justify-center mube:rounded-full mube:bg-white/10 mube:text-white mube:hover:bg-white/20";
    return (_jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": a.nome, className: "mube:fixed mube:inset-0 mube:z-[2147483003] mube:flex mube:flex-col mube:bg-black/90 mube:animar-entrar", onMouseDown: (e) => e.target === e.currentTarget && aoFechar(), children: [_jsxs("div", { className: "mube:flex mube:h-14 mube:shrink-0 mube:items-center mube:gap-3 mube:px-4 mube:text-white", children: [_jsx("span", { className: "mube:min-w-0 mube:flex-1 mube:truncate mube:text-label", children: a.nome }), total > 1 && (_jsxs("span", { className: "mube:text-body-xs mube:text-white/70", children: [indice + 1, " de ", total] })), a.url && (_jsx("a", { href: a.url, target: "_blank", rel: "noreferrer", "aria-label": `Abrir ${a.nome}`, className: "mube:flex mube:size-9 mube:items-center mube:justify-center mube:rounded-full mube:hover:bg-white/10", children: _jsx(Icone, { nome: "Download" }) })), _jsx("button", { ref: fechar, type: "button", onClick: aoFechar, "aria-label": "Fechar", className: "mube:flex mube:size-9 mube:items-center mube:justify-center mube:rounded-full mube:hover:bg-white/10", children: _jsx(Icone, { nome: "X" }) })] }), _jsxs("div", { className: "mube:relative mube:flex mube:min-h-0 mube:flex-1 mube:items-center mube:justify-center mube:px-4 mube:pb-6 mube:md:px-20", onMouseDown: (e) => e.target === e.currentTarget && aoFechar(), children: [tipoDeMedia(a.tipo_mime) === "video" && a.url ? (_jsx("div", { className: "mube:w-full mube:max-w-4xl", children: _jsx(Leitor, { url: a.url, tipo: "video", nome: a.nome, grande: true }, a.id) })) : (
                    // eslint-disable-next-line @next/next/no-img-element -- URL assinada de curta duração
                    _jsx("img", { src: a.url, alt: a.nome, className: "mube:max-h-full mube:max-w-full mube:rounded-lg mube:object-contain" }, a.id)), total > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", "aria-label": "Anterior", onClick: () => aoMudar((indice - 1 + total) % total), className: `${seta} mube:left-3`, children: _jsx(Icone, { nome: "Chevron left" }) }), _jsx("button", { type: "button", "aria-label": "Seguinte", onClick: () => aoMudar((indice + 1) % total), className: `${seta} mube:right-3`, children: _jsx(Icone, { nome: "Chevron right" }) })] }))] })] }));
}
/**
 * Os anexos de um relato ou comentário: imagens em miniatura (abrem o
 * lightbox), áudio e vídeo com leitor, o resto com o File do Figma.
 */
export function Anexos({ anexos, compacto }) {
    const [aberto, setAberto] = useState(null);
    if (!anexos.length)
        return null;
    const visuais = anexos.filter((a) => a.url && (tipoDeMedia(a.tipo_mime) === "imagem" || tipoDeMedia(a.tipo_mime) === "video"));
    const imagens = anexos.filter((a) => a.url && tipoDeMedia(a.tipo_mime) === "imagem");
    const leitores = anexos.filter((a) => a.url && (tipoDeMedia(a.tipo_mime) === "audio" || tipoDeMedia(a.tipo_mime) === "video"));
    const outros = anexos.filter((a) => !a.url || !tipoDeMedia(a.tipo_mime));
    const abrir = (a) => setAberto(visuais.findIndex((v) => v.id === a.id));
    return (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2", children: [imagens.length > 0 && (_jsx("ul", { className: `mube:grid mube:gap-2 ${compacto ? "mube:grid-cols-3" : "mube:grid-cols-2"}`, children: imagens.map((a) => (_jsx("li", { children: _jsx("button", { type: "button", onClick: () => abrir(a), "aria-label": `Ver ${a.nome}`, className: "mube:group mube:block mube:w-full mube:overflow-hidden mube:rounded-lg mube:border mube:border-border mube:bg-muted mube:focus-visible:shadow-focus", children: _jsx("img", { src: a.url, alt: "", className: `mube:w-full mube:object-cover mube:transition-transform mube:duration-300 mube:group-hover:scale-[1.03] ${compacto ? "mube:h-20" : "mube:h-28"}` }) }) }, a.id))) })), leitores.map((a) => (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1", children: [_jsx(Leitor, { url: a.url, tipo: tipoDeMedia(a.tipo_mime), nome: a.nome, aoAmpliar: tipoDeMedia(a.tipo_mime) === "video" ? () => abrir(a) : undefined }), _jsxs("span", { className: "mube:truncate mube:px-1 mube:text-body-xs mube:text-muted-foreground", children: [a.nome, " \u00B7 ", tamanho(a.tamanho_bytes)] })] }, a.id))), outros.length > 0 && (_jsx("ul", { className: "mube:flex mube:flex-col mube:gap-1", children: outros.map((a) => {
                    const conteudo = (_jsxs(_Fragment, { children: [_jsx(Ficheiro, { nome: a.nome, tipoMime: a.tipo_mime, tamanho: 36 }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-col", children: [_jsx("span", { className: "mube:truncate mube:text-label-sm mube:text-foreground", children: a.nome }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: tamanho(a.tamanho_bytes) })] })] }));
                    return (_jsx("li", { children: a.url ? (_jsx("a", { href: a.url, target: "_blank", rel: "noreferrer", className: "mube:flex mube:items-center mube:gap-2.5 mube:rounded-lg mube:p-1 mube:transition-colors mube:hover:bg-muted", children: conteudo })) : (_jsx("span", { className: "mube:flex mube:items-center mube:gap-2.5 mube:p-1", children: conteudo })) }, a.id));
                }) })), aberto !== null && aberto >= 0 && _jsx(Lightbox, { itens: visuais, indice: aberto, aoMudar: setAberto, aoFechar: () => setAberto(null) })] }));
}
