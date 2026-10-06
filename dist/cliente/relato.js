"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSuporte } from "./componente";
import { Ficheiro } from "./ficheiros";
import { Botao, BotaoIcone, Icone, Janela, Rodinha, tamanho } from "./ui";
export function useEnvios(api) {
    const [envios, setEnvios] = useState([]);
    const controlos = useRef(new Map());
    const mudar = (chave, m) => setEnvios((l) => l.map((e) => (e.chave === chave ? { ...e, ...m } : e)));
    const enviarUm = useCallback((ficheiro, nome, chave) => {
        const controlo = new AbortController();
        controlos.current.set(chave, controlo);
        api
            .enviar(ficheiro, nome, (p) => mudar(chave, { progresso: p }), controlo.signal)
            .then((f) => mudar(chave, { estado: "enviado", progresso: 1, id: f.id }))
            .catch((e) => e.codigo !== "cancelado" && mudar(chave, { estado: "falhou", erro: e.message }));
    }, [api]);
    const juntar = useCallback((ficheiros) => {
        const novos = ficheiros.map((f) => {
            const blob = f instanceof File ? f : f.blob;
            const nome = f instanceof File ? f.name : f.nome;
            return { blob, nome, envio: { chave: crypto.randomUUID(), nome, tipo: blob.type, bytes: blob.size, progresso: 0, estado: "a_enviar", audio: !(f instanceof File) && f.audio } };
        });
        setEnvios((l) => [...l, ...novos.map((n) => n.envio)]);
        for (const n of novos)
            enviarUm(n.blob, n.nome, n.envio.chave);
        return novos.map((n) => n.envio.chave);
    }, [enviarUm]);
    const retirar = useCallback((chave) => {
        controlos.current.get(chave)?.abort();
        setEnvios((l) => l.filter((e) => e.chave !== chave));
    }, []);
    return {
        envios,
        juntar,
        retirar,
        limpar: () => setEnvios([]),
        ids: envios.filter((e) => e.estado === "enviado" && e.id).map((e) => e.id),
        aEnviar: envios.some((e) => e.estado === "a_enviar"),
        falhados: envios.some((e) => e.estado === "falhou"),
    };
}
export function ListaDeEnvios({ envios, aoRetirar }) {
    if (!envios.length)
        return null;
    return (_jsx("ul", { className: "mube:flex mube:flex-col mube:gap-2", children: envios.map((e) => (_jsxs("li", { className: "mube:flex mube:items-center mube:gap-3 mube:rounded-xl mube:border mube:border-border mube:p-2.5 mube:animar-entrar", children: [_jsx(Ficheiro, { nome: e.nome, tipoMime: e.tipo, tamanho: 32 }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col mube:gap-1", children: [_jsx("span", { className: "mube:truncate mube:text-label mube:text-foreground", children: e.nome }), e.estado === "a_enviar" ? (_jsx("span", { className: "mube:h-1 mube:overflow-hidden mube:rounded-full mube:bg-muted", role: "progressbar", "aria-valuenow": Math.round(e.progresso * 100), "aria-valuemin": 0, "aria-valuemax": 100, children: _jsx("span", { className: "mube:block mube:h-full mube:rounded-full mube:bg-primary mube:transition-[width] mube:duration-200", style: { width: `${Math.max(4, e.progresso * 100)}%` } }) })) : (_jsx("span", { className: `mube:text-body-xs ${e.estado === "falhou" ? "mube:text-status-error" : "mube:text-muted-foreground"}`, children: e.estado === "falhou" ? (e.erro ?? "O envio falhou.") : `${tamanho(e.bytes)} · Enviado` }))] }), _jsx(BotaoIcone, { icone: "X", rotulo: `Retirar ${e.nome}`, onClick: () => aoRetirar(e.chave) })] }, e.chave))) }));
}
/** Zona de soltar ficheiros (Figma: Upload). */
export function ZonaDeSoltar({ aoEscolher, texto = "Arraste ficheiros ou clique para enviar", ajuda = "PDF, imagem, vídeo ou áudio" }) {
    const [sobre, setSobre] = useState(false);
    const entrada = useRef(null);
    return (_jsxs("button", { type: "button", onClick: () => entrada.current?.click(), onDragOver: (e) => {
            e.preventDefault();
            setSobre(true);
        }, onDragLeave: () => setSobre(false), onDrop: (e) => {
            e.preventDefault();
            setSobre(false);
            if (e.dataTransfer.files.length)
                aoEscolher([...e.dataTransfer.files]);
        }, className: `mube:flex mube:w-full mube:flex-col mube:items-center mube:justify-center mube:gap-1 mube:rounded-xl mube:border mube:border-dashed mube:px-4 mube:py-7 mube:text-center mube:transition-colors mube:duration-150 mube:focus-visible:shadow-focus ${sobre ? "mube:border-primary mube:bg-accent" : "mube:border-input mube:bg-muted mube:hover:bg-accent"}`, children: [_jsx(Icone, { nome: "Upload", className: "mube:mb-1 mube:text-muted-foreground" }), _jsx("span", { className: "mube:text-label mube:text-foreground", children: sobre ? "Solte para enviar" : texto }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: ajuda }), _jsx("input", { ref: entrada, type: "file", multiple: true, hidden: true, onChange: (e) => {
                    if (e.target.files?.length)
                        aoEscolher([...e.target.files]);
                    e.target.value = "";
                } })] }));
}
// ─── Gravação de áudio (Figma: Embed / Audio recorder) ───────────────────────
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export function GravadorDeAudio({ aoGravar, gravado, aoRetirar }) {
    const [estado, setEstado] = useState("parado");
    const [segundos, setSegundos] = useState(0);
    const [erro, setErro] = useState(null);
    const gravador = useRef(null);
    const inicio = useRef(0);
    useEffect(() => {
        if (estado !== "a_gravar")
            return;
        const id = window.setInterval(() => setSegundos((Date.now() - inicio.current) / 1000), 250);
        return () => window.clearInterval(id);
    }, [estado]);
    async function gravar() {
        setErro(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const partes = [];
            const r = new MediaRecorder(stream);
            r.ondataavailable = (e) => e.data.size && partes.push(e.data);
            r.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                aoGravar(new Blob(partes, { type: r.mimeType || "audio/webm" }), (Date.now() - inicio.current) / 1000);
                setEstado("parado");
            };
            gravador.current = r;
            inicio.current = Date.now();
            setSegundos(0);
            r.start();
            setEstado("a_gravar");
        }
        catch {
            setErro("Sem acesso ao microfone.");
        }
    }
    if (estado === "a_gravar") {
        return (_jsxs("span", { className: "mube:inline-flex mube:h-8 mube:items-center mube:gap-2 mube:rounded-full mube:bg-muted mube:pr-1 mube:pl-3 mube:text-label-sm", children: [_jsx("span", { "aria-hidden": true, className: "mube:size-2 mube:rounded-full mube:bg-status-error mube:animar-pulso" }), _jsx("span", { className: "mube:font-mono mube:tabular-nums", children: mmss(segundos) }), _jsxs("button", { type: "button", onClick: () => gravador.current?.stop(), className: "mube:flex mube:h-6 mube:items-center mube:gap-1 mube:rounded-full mube:bg-primary mube:px-2.5 mube:text-primary-foreground", children: [_jsx(Icone, { nome: "Stop", tamanho: 12 }), "Parar"] })] }));
    }
    if (gravado) {
        return (_jsxs("span", { className: "mube:inline-flex mube:h-8 mube:items-center mube:gap-2 mube:rounded-full mube:border mube:border-border mube:bg-card mube:pr-1 mube:pl-3 mube:text-label-sm mube:text-foreground", children: [_jsx(Icone, { nome: "Play", tamanho: 12 }), "\u00C1udio \u00B7 ", mmss(gravado.segundos), _jsx("button", { type: "button", onClick: gravar, className: "mube:px-1 mube:text-muted-foreground mube:hover:text-foreground", children: "Regravar" }), _jsx(BotaoIcone, { icone: "X", rotulo: "Retirar o \u00E1udio", onClick: aoRetirar, className: "mube:size-6" })] }));
    }
    return (_jsxs("span", { className: "mube:inline-flex mube:items-center mube:gap-2", children: [erro && _jsx("span", { className: "mube:text-body-xs mube:text-status-error", children: erro }), _jsxs("button", { type: "button", onClick: gravar, className: "mube:inline-flex mube:h-8 mube:items-center mube:gap-1.5 mube:rounded-full mube:border mube:border-border mube:bg-card mube:px-3 mube:text-label-sm mube:text-foreground mube:hover:bg-muted", children: [_jsx(Icone, { nome: "Mic", tamanho: 14 }), "Gravar \u00E1udio"] })] }));
}
// ─── Novo relato (Figma: Embed 5.2) ──────────────────────────────────────────
const IMPACTOS = [
    { valor: "impede", rotulo: "Impede o meu trabalho", ajuda: "Não consigo continuar sem isto resolvido" },
    { valor: "contorno", rotulo: "Consigo contornar", ajuda: "Há outro caminho, mas é pior" },
    { valor: "incomoda", rotulo: "Só incomoda", ajuda: "Não atrapalha o trabalho" },
];
const RASCUNHO = "mube-rascunho-do-relato";
function lerRascunho() {
    try {
        return JSON.parse(localStorage.getItem(RASCUNHO) ?? "null");
    }
    catch {
        return null;
    }
}
export function NovoRelato({ aoFechar, aoCriar }) {
    const { api, abrirTicket } = useSuporte();
    const [inicial] = useState(lerRascunho);
    const [texto, setTexto] = useState(inicial?.texto ?? "");
    const [impacto, setImpacto] = useState(inicial?.impacto ?? null);
    // K10: a mesma chave em todos os reenvios deste rascunho.
    const [chave] = useState(() => inicial?.chave ?? crypto.randomUUID());
    const [audio, setAudio] = useState(null);
    const [validar, setValidar] = useState(false);
    const [estado, setEstado] = useState("editar");
    const [erro, setErro] = useState(null);
    const [criado, setCriado] = useState(null);
    const envios = useEnvios(api);
    // O rascunho fica neste navegador até ser enviado (K10).
    useEffect(() => {
        if (criado)
            return;
        try {
            if (texto || impacto)
                localStorage.setItem(RASCUNHO, JSON.stringify({ texto, impacto, chave }));
        }
        catch {
            // armazenamento indisponível: segue sem rascunho
        }
    }, [texto, impacto, chave, criado]);
    useEffect(() => {
        if (estado !== "sem_ligacao")
            return;
        const voltou = () => setEstado("ligacao_voltou");
        window.addEventListener("online", voltou);
        return () => window.removeEventListener("online", voltou);
    }, [estado]);
    const semDescricao = !texto.trim() && !envios.ids.length;
    async function enviar() {
        setValidar(true);
        if (semDescricao || !impacto || envios.aEnviar)
            return;
        setEstado("a_enviar");
        setErro(null);
        try {
            const r = await api.relatar({ texto: texto.trim() || undefined, impacto, ficheiros: envios.ids, chaveIdempotencia: chave });
            try {
                localStorage.removeItem(RASCUNHO);
            }
            catch {
                // nada a limpar
            }
            setCriado(r.ticket);
            aoCriar(r.ticket);
        }
        catch (e) {
            const falha = e;
            if (falha.codigo === "sem_ligacao" || !navigator.onLine)
                setEstado("sem_ligacao");
            else {
                setEstado("erro");
                setErro(falha.message);
            }
        }
    }
    if (criado) {
        return (_jsx(Janela, { titulo: "Relato enviado", aoFechar: aoFechar, rodape: _jsx(Botao, { "data-principal": true, onClick: () => {
                    aoFechar();
                    abrirTicket(criado.numero);
                }, children: "Ver o ticket" }), children: _jsxs("div", { className: "mube:flex mube:flex-col mube:items-center mube:gap-2 mube:py-4 mube:text-center", children: [_jsx("span", { className: "mube:flex mube:size-11 mube:items-center mube:justify-center mube:rounded-full mube:bg-state-concluida-bg mube:text-state-concluida-fg", children: _jsx(Icone, { nome: "Tick", tamanho: 20 }) }), _jsx("p", { className: "mube:font-mono mube:text-h4 mube:text-foreground", children: criado.codigo }), _jsx("p", { className: "mube:max-w-xs mube:text-body-sm mube:text-muted-foreground", children: "Recebemos o seu relato. A equipa faz a triagem e o estado aparece aqui e nas notifica\u00E7\u00F5es." })] }) }));
    }
    return (_jsxs(Janela, { titulo: "Novo relato", aoFechar: aoFechar, largura: "mube:md:w-[560px]", rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Cancelar" }), _jsx(Botao, { "data-principal": true, aCarregar: estado === "a_enviar", disabled: envios.aEnviar, onClick: enviar, children: envios.aEnviar ? "A enviar ficheiros…" : "Enviar relato" })] }), children: [estado === "sem_ligacao" && (_jsx("p", { role: "status", className: "mube:rounded-xl mube:bg-state-aguardando-aceite-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-aguardando-aceite-fg", children: "Sem liga\u00E7\u00E3o. O rascunho ficou guardado neste navegador; envie quando a liga\u00E7\u00E3o voltar." })), estado === "ligacao_voltou" && (_jsx("p", { role: "status", className: "mube:rounded-xl mube:bg-state-concluida-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-concluida-fg", children: "A liga\u00E7\u00E3o voltou. Pode enviar o relato." })), estado === "erro" && erro && _jsx("p", { className: "mube:rounded-xl mube:bg-state-contencao-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-contencao-fg", children: erro }), _jsxs("label", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [_jsx("span", { className: "mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Descri\u00E7\u00E3o" }), _jsxs("span", { className: `mube:flex mube:flex-col mube:gap-2 mube:rounded-xl mube:border mube:bg-card mube:p-3 mube:transition-[border-color,box-shadow] mube:focus-within:border-foreground mube:focus-within:shadow-input-focus ${validar && semDescricao ? "mube:border-destructive" : "mube:border-input"}`, children: [_jsx("textarea", { value: texto, onChange: (e) => setTexto(e.target.value), rows: 4, maxLength: 20000, placeholder: "O que aconteceu? O que estava a fazer quando o problema apareceu?", className: "mube:min-h-24 mube:w-full mube:resize-none mube:text-body mube:text-foreground mube:placeholder:text-muted-foreground mube:focus:outline-none" }), _jsx("span", { className: "mube:flex mube:justify-end", children: _jsx(GravadorDeAudio, { gravado: audio, aoRetirar: () => {
                                        if (audio)
                                            envios.retirar(audio.chave);
                                        setAudio(null);
                                    }, aoGravar: (blob, segundos) => {
                                        if (audio)
                                            envios.retirar(audio.chave);
                                        const [c] = envios.juntar([{ blob, nome: `audio-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`, audio: true }]);
                                        setAudio({ chave: c, segundos });
                                    } }) })] }), validar && semDescricao && _jsx("span", { className: "mube:text-body-xs mube:text-destructive", children: "Descreva o problema, grave um \u00E1udio ou junte um ficheiro." })] }), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("span", { className: "mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Anexos" }), _jsx(ZonaDeSoltar, { aoEscolher: (f) => envios.juntar(f) }), _jsx(ListaDeEnvios, { envios: envios.envios.filter((e) => !e.audio), aoRetirar: envios.retirar })] }), _jsxs("fieldset", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("legend", { className: "mube:mb-2 mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Impacto para si" }), _jsx("div", { className: "mube:flex mube:flex-col mube:gap-2", children: IMPACTOS.map((i) => {
                            const escolhido = impacto === i.valor;
                            return (_jsxs("label", { className: `mube:flex mube:h-full mube:cursor-pointer mube:items-center mube:gap-3 mube:rounded-xl mube:border mube:px-3 mube:py-2 mube:transition-colors mube:duration-150 ${escolhido ? "mube:border-foreground" : validar && !impacto ? "mube:border-destructive" : "mube:border-border mube:hover:bg-muted"}`, children: [_jsx("input", { type: "radio", name: "impacto", value: i.valor, checked: escolhido, onChange: () => setImpacto(i.valor), className: "mube:sr-only" }), _jsx("span", { "aria-hidden": true, className: `mube:flex mube:size-4 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:border ${escolhido ? "mube:border-primary mube:bg-primary" : "mube:border-input"}`, children: escolhido && _jsx("span", { className: "mube:size-1.5 mube:rounded-full mube:bg-primary-foreground" }) }), _jsxs("span", { className: "mube:flex mube:flex-col", children: [_jsx("span", { className: "mube:text-label mube:text-foreground", children: i.rotulo }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: i.ajuda })] })] }, i.valor));
                        }) }), validar && !impacto && _jsx("span", { className: "mube:text-body-xs mube:text-destructive", children: "Escolha o impacto." })] }), _jsx("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: "A prioridade \u00E9 definida pela equipa depois da triagem." }), estado === "a_enviar" && (_jsxs("p", { role: "status", className: "mube:flex mube:items-center mube:gap-2 mube:text-body-sm mube:text-muted-foreground", children: [_jsx(Rodinha, {}), " A enviar o relato\u2026"] }))] }));
}
