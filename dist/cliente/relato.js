"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSuporte } from "./componente.js";
import { Ficheiro } from "./ficheiros.js";
import { Botao, BotaoIcone, Icone, Janela, Rodinha, tamanho } from "./ui.js";
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
/** A onda enquanto se grava: segue o volume real da voz (o mesmo desenho do Operacional). */
function OndaAoVivo({ volume, tempo }) {
    const barras = Array.from({ length: 40 }, (_, i) => Math.max(0.08, volume * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.9 + tempo * 7)))));
    return (_jsx("span", { "aria-hidden": true, className: "mube:flex mube:h-14 mube:min-w-0 mube:flex-1 mube:items-center mube:justify-center mube:gap-[3px] mube:overflow-hidden", children: barras.map((v, i) => (_jsx("span", { className: "mube:w-[3px] mube:shrink-0 mube:rounded-full mube:bg-foreground mube:transition-[height] mube:duration-100", style: { height: `${Math.round(v * 100)}%` } }, i))) }));
}
/** O áudio já gravado: ouvir, a onda, o tempo, regravar e retirar. */
function AudioGravado({ url, onda, segundos, aoRegravar, aoRetirar }) {
    const leitor = useRef(null);
    const [aTocar, setATocar] = useState(false);
    return (_jsxs("span", { className: "mube:flex mube:h-11 mube:w-full mube:items-center mube:gap-2 mube:rounded-[10px] mube:bg-muted mube:px-2 mube:text-label-sm", children: [url && _jsx("audio", { ref: leitor, src: url, onEnded: () => setATocar(false), className: "mube:hidden" }), _jsx(BotaoIcone, { icone: aTocar ? "Stop" : "Play", rotulo: aTocar ? "Parar o áudio" : "Ouvir o áudio", className: "mube:size-7 mube:bg-card", onClick: () => {
                    const a = leitor.current;
                    if (!a)
                        return;
                    if (aTocar) {
                        a.pause();
                        a.currentTime = 0;
                        setATocar(false);
                    }
                    else {
                        void a.play();
                        setATocar(true);
                    }
                } }), _jsx("span", { "aria-hidden": true, className: "mube:flex mube:h-6 mube:min-w-0 mube:flex-1 mube:items-center mube:gap-0.5 mube:overflow-hidden", children: onda.map((v, i) => (_jsx("span", { className: "mube:w-0.5 mube:shrink-0 mube:rounded-full mube:bg-muted-foreground", style: { height: `${Math.max(12, Math.round(v * 100))}%` } }, i))) }), _jsx("span", { className: "mube:font-mono mube:tabular-nums mube:text-muted-foreground", children: mmss(segundos) }), _jsx("button", { type: "button", onClick: aoRegravar, className: "mube:px-1 mube:text-muted-foreground mube:hover:text-foreground", children: "Regravar" }), _jsx(BotaoIcone, { icone: "X", rotulo: "Retirar o \u00E1udio", onClick: aoRetirar, className: "mube:size-6" })] }));
}
/**
 * Gravar áudio (v0.8.0): enquanto grava, o tempo e a onda do volume real; no
 * fim, o áudio com a onda, para ouvir, regravar ou retirar. `aoEstado` diz a
 * quem usa que está a gravar (o formulário esconde o texto e trava o envio).
 */
export function GravadorDeAudio({ aoGravar, gravado, aoRetirar, aoEstado, }) {
    const [estado, setEstado] = useState("parado");
    const [segundos, setSegundos] = useState(0);
    const [volume, setVolume] = useState(0);
    const [erro, setErro] = useState(null);
    const [url, setUrl] = useState(null);
    const [onda, setOnda] = useState([]);
    const gravador = useRef(null);
    const fluxo = useRef(null);
    const inicio = useRef(0);
    const cancelado = useRef(false);
    const amostras = useRef([]);
    const contexto = useRef(null);
    const quadro = useRef(null);
    const mudarEstado = (e) => {
        setEstado(e);
        aoEstado?.(e === "a_gravar");
    };
    useEffect(() => {
        if (estado !== "a_gravar")
            return;
        const id = window.setInterval(() => setSegundos((Date.now() - inicio.current) / 1000), 250);
        return () => window.clearInterval(id);
    }, [estado]);
    useEffect(() => () => {
        if (quadro.current != null)
            cancelAnimationFrame(quadro.current);
        void contexto.current?.close().catch(() => { });
        // v0.8.2: fechar a gravar larga o microfone; no iOS, ele ficava preso.
        cancelado.current = true;
        if (gravador.current?.state === "recording")
            gravador.current.stop();
        fluxo.current?.getTracks().forEach((t) => t.stop());
    }, []);
    function ouvirVolume(stream) {
        try {
            const ctx = new AudioContext();
            const analisador = ctx.createAnalyser();
            analisador.fftSize = 256;
            ctx.createMediaStreamSource(stream).connect(analisador);
            contexto.current = ctx;
            const dados = new Uint8Array(analisador.frequencyBinCount);
            const ler = () => {
                analisador.getByteTimeDomainData(dados);
                let soma = 0;
                for (const d of dados)
                    soma += ((d - 128) / 128) ** 2;
                const v = Math.min(1, Math.sqrt(soma / dados.length) * 3.5);
                setVolume(v);
                amostras.current.push(v);
                quadro.current = requestAnimationFrame(ler);
            };
            ler();
        }
        catch {
            // Sem análise de áudio: grava-se na mesma, sem onda.
        }
    }
    function pararDeOuvir() {
        if (quadro.current != null)
            cancelAnimationFrame(quadro.current);
        quadro.current = null;
        void contexto.current?.close().catch(() => { });
        contexto.current = null;
        setVolume(0);
    }
    async function gravar() {
        setErro(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            fluxo.current = stream;
            const partes = [];
            const r = new MediaRecorder(stream);
            r.ondataavailable = (e) => e.data.size && partes.push(e.data);
            r.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                pararDeOuvir();
                mudarEstado("parado");
                if (cancelado.current)
                    return;
                const blob = new Blob(partes, { type: r.mimeType || "audio/webm" });
                // 60 barras, com o maior volume de cada pedaço.
                const a = amostras.current;
                const passo = Math.max(1, Math.floor(a.length / 60));
                setOnda(Array.from({ length: Math.min(60, a.length) }, (_, i) => Math.max(...a.slice(i * passo, (i + 1) * passo), 0)));
                setUrl((antes) => {
                    if (antes)
                        URL.revokeObjectURL(antes);
                    return URL.createObjectURL(blob);
                });
                aoGravar(blob, (Date.now() - inicio.current) / 1000);
            };
            gravador.current = r;
            inicio.current = Date.now();
            cancelado.current = false;
            amostras.current = [];
            setSegundos(0);
            r.start();
            ouvirVolume(stream);
            mudarEstado("a_gravar");
        }
        catch {
            setErro("Sem acesso ao microfone.");
        }
    }
    if (estado === "a_gravar") {
        return (_jsxs("span", { className: "mube:flex mube:w-full mube:flex-col mube:gap-2", children: [_jsxs("span", { className: "mube:flex mube:items-center mube:gap-2 mube:text-label-sm mube:text-muted-foreground", children: [_jsx("span", { "aria-hidden": true, className: "mube:size-2 mube:rounded-full mube:bg-status-error mube:animar-pulso" }), "A ouvir", _jsx("span", { className: "mube:ml-auto mube:font-mono mube:tabular-nums mube:text-foreground", children: mmss(segundos) })] }), _jsx(OndaAoVivo, { volume: volume, tempo: segundos }), _jsxs("span", { className: "mube:flex mube:justify-end mube:gap-2", children: [_jsx(Botao, { estilo: "secundario", onClick: () => {
                                cancelado.current = true;
                                gravador.current?.stop();
                            }, children: "Cancelar" }), _jsx(Botao, { onClick: () => gravador.current?.stop(), children: "Terminar" })] })] }));
    }
    if (gravado)
        return _jsx(AudioGravado, { url: url, onda: onda, segundos: gravado.segundos, aoRegravar: gravar, aoRetirar: aoRetirar });
    return (_jsxs("span", { className: "mube:inline-flex mube:items-center mube:gap-2", children: [erro && _jsx("span", { className: "mube:text-body-xs mube:text-status-error", children: erro }), _jsxs("button", { type: "button", onClick: gravar, className: "mube:inline-flex mube:h-8 mube:items-center mube:gap-1.5 mube:rounded-full mube:border mube:border-border mube:bg-card mube:px-3 mube:text-label-sm mube:text-foreground mube:transition-colors mube:duration-150 mube:hover:bg-muted", children: [_jsx(Icone, { nome: "Mic", tamanho: 14 }), "Gravar \u00E1udio"] })] }));
}
// ─── Novo relato (Figma: Embed 5.2) ──────────────────────────────────────────
const IMPACTOS = [
    { valor: "impede", rotulo: "Impede o meu trabalho", ajuda: "Não consigo continuar sem isto resolvido" },
    { valor: "contorno", rotulo: "Consigo contornar", ajuda: "Há outro caminho, mas é pior" },
    { valor: "incomoda", rotulo: "Só incomoda", ajuda: "Não atrapalha o trabalho" },
];
/** v0.7.0, opção `sugestoes`: a escolha no topo do formulário. */
const TIPOS = [
    { valor: "erro", rotulo: "Erro" },
    { valor: "sugestao", rotulo: "Sugestão" },
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
export function NovoRelato({ aoFechar, aoCriar, soSugestao = false, tipoInicial, pagina, aoSugerir, }) {
    const { api, abrirTicket, abrirSugestao, sessao, sugestoes = false } = useSuporte();
    const [inicial] = useState(lerRascunho);
    const [texto, setTexto] = useState(inicial?.texto ?? "");
    const [impacto, setImpacto] = useState(inicial?.impacto ?? null);
    // Sem a opção `sugestoes`, é sempre um erro (o formulário de sempre).
    const [escolhido, setTipo] = useState(tipoInicial ?? (inicial?.tipo === "sugestao" ? "sugestao" : "erro"));
    const tipo = soSugestao ? "sugestao" : sugestoes ? escolhido : "erro";
    const sugestao = tipo === "sugestao";
    // K10: a mesma chave em todos os reenvios deste rascunho.
    const [chave] = useState(() => inicial?.chave ?? crypto.randomUUID());
    const [audio, setAudio] = useState(null);
    const [aGravar, setAGravar] = useState(false);
    // A transcrição do áudio gravado (v0.8.0): o texto entra na descrição; o áudio vai na mesma.
    const [transcricao, setTranscricao] = useState(null);
    const transcrito = useRef(null);
    const [validar, setValidar] = useState(false);
    const [estado, setEstado] = useState("editar");
    const [erro, setErro] = useState(null);
    const [criado, setCriado] = useState(null);
    const envios = useEnvios(api);
    // v0.8.2: a meio do envio não se fecha. Com ref, para o `aoFechar` da janela ficar estável.
    const aEnviar = useRef(false);
    aEnviar.current = estado === "a_enviar";
    const fechar = useCallback(() => {
        if (!aEnviar.current)
            aoFechar();
    }, [aoFechar]);
    // Assim que o áudio sobe, pede-se o texto, uma vez por gravação.
    const idDoAudio = envios.envios.find((e) => e.chave === audio?.chave)?.id;
    useEffect(() => {
        if (!idDoAudio || transcrito.current === idDoAudio)
            return;
        transcrito.current = idDoAudio;
        setTranscricao("a_transcrever");
        api
            .transcrever(idDoAudio)
            .then((r) => {
            setTranscricao(null);
            if (r.texto)
                setTexto((t) => (t.trim() ? `${t.trim()}\n\n${r.texto}` : r.texto));
        })
            .catch(() => setTranscricao("falhou"));
    }, [api, idDoAudio]);
    // O rascunho fica neste navegador até ser enviado (K10).
    useEffect(() => {
        if (criado)
            return;
        try {
            if (texto || impacto)
                localStorage.setItem(RASCUNHO, JSON.stringify({ texto, impacto, chave, tipo }));
        }
        catch {
            // armazenamento indisponível: segue sem rascunho
        }
    }, [texto, impacto, chave, criado, tipo]);
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
        // Na sugestão, o impacto não se pede.
        if (semDescricao || (!sugestao && !impacto) || envios.aEnviar || aGravar)
            return;
        setEstado("a_enviar");
        setErro(null);
        const corpo = [texto.trim(), pagina && `Página: ${pagina}`].filter(Boolean).join("\n\n") || undefined;
        try {
            const limpar = () => {
                try {
                    localStorage.removeItem(RASCUNHO);
                }
                catch {
                    // nada a limpar
                }
            };
            if (sugestao) {
                const r = await api.sugerir({ texto: corpo, ficheiros: envios.ids, chaveIdempotencia: chave });
                limpar();
                setCriado({ numero: r.sugestao.numero, codigo: r.sugestao.codigo, tipo: "sugestao" });
                aoSugerir?.();
            }
            else {
                const r = await api.relatar({ texto: corpo, impacto: impacto, ficheiros: envios.ids, chaveIdempotencia: chave });
                limpar();
                setCriado({ numero: r.ticket.numero, codigo: r.ticket.codigo, tipo: "erro" });
                aoCriar?.(r.ticket);
            }
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
        // Quem não está liberado (relatos abertos, v0.7.0) não vê os tickets: só "Fechar".
        const veOTicket = sugestao ? sessao.sugestoes === true : sessao.liberado;
        return (_jsx(Janela, { titulo: sugestao ? "Sugestão enviada" : "Relato enviado", aoFechar: aoFechar, rodape: veOTicket ? (_jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Fechar" }), _jsx(Botao, { "data-principal": true, onClick: () => {
                            aoFechar();
                            if (sugestao)
                                abrirSugestao(criado.numero);
                            else
                                abrirTicket(criado.numero);
                        }, children: sugestao ? "Ver a sugestão" : "Ver o ticket" })] })) : (_jsx(Botao, { "data-principal": true, onClick: aoFechar, children: "Fechar" })), children: _jsxs("div", { className: "mube:flex mube:flex-col mube:items-center mube:gap-2 mube:py-4 mube:text-center", children: [_jsx("span", { className: "mube:flex mube:size-11 mube:items-center mube:justify-center mube:rounded-full mube:bg-state-concluida-bg mube:text-state-concluida-fg", children: _jsx(Icone, { nome: "Tick", tamanho: 20 }) }), _jsx("p", { className: "mube:font-mono mube:text-h4 mube:text-foreground", children: criado.codigo }), _jsxs("p", { className: "mube:max-w-xs mube:text-body-sm mube:text-muted-foreground", children: [sugestao ? "Recebemos a sua sugestão." : "Recebemos o seu relato.", " ", sugestao
                                ? veOTicket
                                    ? "A equipa analisa-a e a resposta aparece em Sugestões."
                                    : "A equipa da Mube analisa-a."
                                : veOTicket
                                    ? "A equipa faz a triagem e o estado aparece no suporte e nas notificações."
                                    : "A equipa da Mube faz a triagem."] })] }) }));
    }
    return (_jsxs(Janela, { titulo: sugestao ? "Nova sugestão" : "Novo relato", aoFechar: fechar, largura: "mube:md:w-[560px]", rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", disabled: estado === "a_enviar", onClick: fechar, children: "Cancelar" }), _jsx(Botao, { "data-principal": true, aCarregar: estado === "a_enviar", disabled: envios.aEnviar || aGravar, onClick: enviar, children: envios.aEnviar ? "A enviar ficheiros…" : sugestao ? "Enviar sugestão" : "Enviar relato" })] }), children: [estado === "sem_ligacao" && (_jsx("p", { role: "status", className: "mube:rounded-xl mube:bg-state-aguardando-aceite-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-aguardando-aceite-fg", children: "Sem liga\u00E7\u00E3o. O rascunho ficou guardado neste navegador; envie quando a liga\u00E7\u00E3o voltar." })), estado === "ligacao_voltou" && (_jsx("p", { role: "status", className: "mube:rounded-xl mube:bg-state-concluida-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-concluida-fg", children: "A liga\u00E7\u00E3o voltou. Pode enviar o relato." })), estado === "erro" && erro && _jsx("p", { className: "mube:rounded-xl mube:bg-state-contencao-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-contencao-fg", children: erro }), sugestoes && !soSugestao && (_jsxs("fieldset", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("legend", { className: "mube:mb-2 mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "O que quer enviar?" }), _jsx("div", { className: "mube:flex mube:gap-1 mube:rounded-full mube:bg-muted mube:p-1", children: TIPOS.map((t) => {
                            const ativo = tipo === t.valor;
                            return (_jsxs("label", { className: `mube:flex mube:h-8 mube:flex-1 mube:cursor-pointer mube:items-center mube:justify-center mube:rounded-full mube:text-label mube:transition-colors mube:duration-150 mube:has-[:focus-visible]:shadow-focus ${ativo ? "mube:bg-card mube:text-foreground mube:shadow-soft-2" : "mube:text-muted-foreground mube:hover:text-foreground"}`, children: [_jsx("input", { type: "radio", name: "tipo", value: t.valor, checked: ativo, onChange: () => setTipo(t.valor), className: "mube:sr-only" }), t.rotulo] }, t.valor));
                        }) })] })), _jsxs("label", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [_jsx("span", { className: "mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: sugestao ? "A sua ideia" : "Descrição" }), _jsxs("span", { className: `mube:flex mube:flex-col mube:gap-2 mube:rounded-xl mube:border mube:bg-card mube:p-3 mube:transition-[border-color,box-shadow] mube:focus-within:border-foreground mube:focus-within:shadow-input-focus ${validar && semDescricao ? "mube:border-destructive" : "mube:border-input"}`, children: [_jsx("textarea", { "data-foco": true, hidden: aGravar, value: texto, onChange: (e) => setTexto(e.target.value), rows: 4, maxLength: 20000, placeholder: sugestao ? "Qual é a ideia? O que gostaria que o software fizesse, e porquê?" : "O que aconteceu? O que estava a fazer quando o problema apareceu?", className: "mube:min-h-24 mube:w-full mube:resize-none mube:text-body mube:text-foreground mube:placeholder:text-muted-foreground mube:focus:outline-none" }), transcricao === "a_transcrever" && (_jsxs("span", { role: "status", className: "mube:flex mube:items-center mube:gap-2 mube:text-body-xs mube:text-muted-foreground", children: [_jsx(Rodinha, {}), " A transcrever o \u00E1udio\u2026"] })), transcricao === "falhou" && _jsx("span", { role: "status", className: "mube:text-body-xs mube:text-muted-foreground", children: "N\u00E3o foi poss\u00EDvel transcrever. O \u00E1udio segue na mesma." }), audio && !transcricao && !aGravar && _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: "Transcrito do \u00E1udio. Pode corrigir o texto." }), _jsx("span", { className: "mube:flex mube:justify-end", children: _jsx(GravadorDeAudio, { gravado: audio, aoEstado: setAGravar, aoRetirar: () => {
                                        if (audio)
                                            envios.retirar(audio.chave);
                                        setAudio(null);
                                        setTranscricao(null);
                                    }, aoGravar: (blob, segundos) => {
                                        if (audio)
                                            envios.retirar(audio.chave);
                                        const [c] = envios.juntar([{ blob, nome: `audio-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.webm`, audio: true }]);
                                        setAudio({ chave: c, segundos });
                                    } }) })] }), validar && semDescricao && (_jsx("span", { className: "mube:text-body-xs mube:text-destructive", children: sugestao ? "Descreva a ideia, grave um áudio ou junte um ficheiro." : "Descreva o problema, grave um áudio ou junte um ficheiro." }))] }), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("span", { className: "mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Anexos" }), _jsx(ZonaDeSoltar, { aoEscolher: (f) => envios.juntar(f) }), _jsx(ListaDeEnvios, { envios: envios.envios.filter((e) => !e.audio), aoRetirar: envios.retirar })] }), !sugestao && (_jsxs("fieldset", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("legend", { className: "mube:mb-2 mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Impacto para si" }), _jsx("div", { className: "mube:flex mube:flex-col mube:gap-2", children: IMPACTOS.map((i) => {
                            const escolhido = impacto === i.valor;
                            return (_jsxs("label", { className: `mube:flex mube:h-full mube:cursor-pointer mube:items-center mube:gap-3 mube:rounded-xl mube:border mube:px-3 mube:py-2 mube:transition-colors mube:duration-150 ${escolhido ? "mube:border-foreground" : validar && !impacto ? "mube:border-destructive" : "mube:border-border mube:hover:bg-muted"}`, children: [_jsx("input", { type: "radio", name: "impacto", value: i.valor, checked: escolhido, onChange: () => setImpacto(i.valor), className: "mube:sr-only" }), _jsx("span", { "aria-hidden": true, className: `mube:flex mube:size-4 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:border ${escolhido ? "mube:border-primary mube:bg-primary" : "mube:border-input"}`, children: escolhido && _jsx("span", { className: "mube:size-1.5 mube:rounded-full mube:bg-primary-foreground" }) }), _jsxs("span", { className: "mube:flex mube:flex-col", children: [_jsx("span", { className: "mube:text-label mube:text-foreground", children: i.rotulo }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: i.ajuda })] })] }, i.valor));
                        }) }), validar && !impacto && _jsx("span", { className: "mube:text-body-xs mube:text-destructive", children: "Escolha o impacto." })] })), _jsxs("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: [sugestao
                        ? `${sessao.sugestoes ? "A equipa analisa cada sugestão e responde aqui, em Sugestões." : "A equipa analisa cada sugestão."} Se for um erro, use «Reportar um problema».`
                        : "A prioridade é definida pela equipa depois da triagem.", pagina && " Vai junto a página onde está, para a equipa saber onde foi."] }), estado === "a_enviar" && (_jsxs("p", { role: "status", className: "mube:flex mube:items-center mube:gap-2 mube:text-body-sm mube:text-muted-foreground", children: [_jsx(Rodinha, {}), " ", sugestao ? "A enviar a sugestão…" : "A enviar o relato…"] }))] }));
}
