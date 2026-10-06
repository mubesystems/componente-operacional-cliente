"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSuporte } from "./componente.js";
import { Ficheiro, Pasta } from "./ficheiros.js";
import { Botao, BotaoIcone, dia, ErroAoCarregar, Esqueleto, Icone, Janela, tamanho, Vazio } from "./ui.js";
const chave = (n) => `${n.tipo}:${n.id}`;
/** O tipo do arrasto interno (não confunde com ficheiros vindos do computador). */
const ARRASTO = "application/x-mube-drive";
/**
 * A Drive como o cliente a vê (Figma: Embed 5.5, S20, S22, S23): só o que a
 * Mube não ocultou. Gere só o que veio do lado do cliente; o resto é leitura
 * (abrir e descarregar). Apagar é lógico.
 */
export function Drive() {
    const { api, versao } = useSuporte();
    const [drive, setDrive] = useState(null);
    const [erro, setErro] = useState(null);
    const [pastaAtual, setPastaAtual] = useState(null);
    const [janela, setJanela] = useState(null);
    // Seleção de vários: ⌘/Ctrl ou Shift + clique, ou arrastar um retângulo a partir do vazio.
    const [selecionados, setSelecionados] = useState(new Set());
    const [ancora, setAncora] = useState(null);
    const [envios, setEnvios] = useState([]);
    const [sobre, setSobre] = useState(false);
    const [aviso, setAviso] = useState(null);
    const entrada = useRef(null);
    const carregar = useCallback(() => {
        api
            .drive()
            .then((d) => {
            setErro(null);
            setDrive(d);
        })
            .catch((e) => setErro(e.message));
    }, [api]);
    useEffect(() => {
        carregar();
    }, [carregar, versao]);
    // A pasta onde se estava pode ter sido ocultada ou apagada entretanto.
    const atual = drive && pastaAtual && !drive.pastas.some((p) => p.id === pastaAtual) ? null : pastaAtual;
    const caminho = [];
    for (let id = atual; id && drive;) {
        const p = drive.pastas.find((x) => x.id === id);
        if (!p)
            break;
        caminho.unshift(p);
        id = p.pasta_id;
    }
    const nos = drive
        ? [
            ...drive.pastas.filter((p) => p.pasta_id === atual).map((p) => ({ tipo: "pasta", ...p })),
            ...drive.itens.filter((i) => i.pasta_id === atual).map((i) => ({ tipo: "item", ...i })),
        ].sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome, "pt") : a.tipo === "pasta" ? -1 : 1))
        : [];
    const contar = (id) => (drive ? drive.pastas.filter((p) => p.pasta_id === id).length + drive.itens.filter((i) => i.pasta_id === id).length : 0);
    function enviar(ficheiros) {
        const destino = atual;
        for (const f of ficheiros) {
            const chave = crypto.randomUUID();
            setEnvios((l) => [...l, { chave, nome: f.name, progresso: 0, estado: "a_enviar" }]);
            const mudar = (m) => setEnvios((l) => l.map((e) => (e.chave === chave ? { ...e, ...m } : e)));
            api
                .enviar(f, f.name, (p) => mudar({ progresso: p }))
                .then((r) => api.porNaDrive(r.id, destino))
                .then(() => {
                mudar({ estado: "feito", progresso: 1 });
                carregar();
            })
                .catch((e) => mudar({ estado: "falhou", erro: e.message }));
        }
    }
    function irPara(pasta) {
        setSelecionados(new Set());
        setPastaAtual(pasta);
    }
    async function abrir(no, descarregar = false) {
        if (no.tipo === "pasta")
            return irPara(no.id);
        try {
            const { url } = await api.urlDoItem(no.id, descarregar);
            window.open(url, "_blank", "noopener");
        }
        catch (e) {
            setAviso(e.message);
        }
    }
    const escolhidos = nos.filter((n) => selecionados.has(chave(n)));
    // Só se move ou elimina o que veio do lado do cliente (S20).
    const todosMeus = escolhidos.length > 0 && escolhidos.every((n) => n.do_cliente);
    function clicar(no, e) {
        const k = chave(no);
        if (e.shiftKey && ancora) {
            const ordem = nos.map(chave);
            const [a, b] = [ordem.indexOf(ancora), ordem.indexOf(k)].sort((x, y) => x - y);
            if (a >= 0)
                return setSelecionados(new Set(ordem.slice(a, b + 1)));
        }
        if (e.metaKey || e.ctrlKey || selecionados.size > 0) {
            setAncora(k);
            setSelecionados((s) => {
                const n = new Set(s);
                if (n.has(k))
                    n.delete(k);
                else
                    n.add(k);
                return n;
            });
            return;
        }
        void abrir(no);
    }
    useEffect(() => {
        if (!selecionados.size)
            return;
        const tecla = (e) => e.key === "Escape" && setSelecionados(new Set());
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [selecionados.size]);
    // ─── Retângulo de seleção ──────────────────────────────────────────────────
    const grelha = useRef(null);
    const inicio = useRef(null);
    const arrastou = useRef(false);
    const [retangulo, setRetangulo] = useState(null);
    function comecarRetangulo(e) {
        if (e.button !== 0 || e.pointerType === "touch")
            return;
        if (e.target.closest("[data-chave], button, input, a"))
            return;
        inicio.current = { x: e.clientX, y: e.clientY, base: e.shiftKey || e.metaKey || e.ctrlKey ? new Set(selecionados) : new Set() };
        arrastou.current = false;
    }
    function moverRetangulo(e) {
        const i = inicio.current;
        if (!i)
            return;
        if (!arrastou.current && Math.hypot(e.clientX - i.x, e.clientY - i.y) < 5)
            return;
        if (!arrastou.current)
            e.currentTarget.setPointerCapture(e.pointerId);
        arrastou.current = true;
        const r = { left: Math.min(i.x, e.clientX), top: Math.min(i.y, e.clientY), width: Math.abs(e.clientX - i.x), height: Math.abs(e.clientY - i.y) };
        setRetangulo(r);
        const dentro = new Set(i.base);
        for (const el of grelha.current?.querySelectorAll("[data-chave]") ?? []) {
            const b = el.getBoundingClientRect();
            if (b.right >= r.left && b.left <= r.left + r.width && b.bottom >= r.top && b.top <= r.top + r.height)
                dentro.add(el.dataset.chave);
        }
        setSelecionados(dentro);
    }
    function acabarRetangulo() {
        inicio.current = null;
        setRetangulo(null);
    }
    // ─── Arrastar para uma pasta ───────────────────────────────────────────────
    const [arrastados, setArrastados] = useState(null);
    const [alvo, setAlvo] = useState(null);
    function aceita(pastaId) {
        if (!arrastados?.length || !drive)
            return false;
        const pastas = new Set(arrastados.filter((a) => a.tipo === "pasta").map((a) => a.id));
        for (let p = pastaId; p; p = drive.pastas.find((x) => x.id === p)?.pasta_id ?? null)
            if (pastas.has(p))
                return false;
        return arrastados.some((a) => a.pasta_id !== pastaId);
    }
    function comecarArrasto(no, e) {
        const k = chave(no);
        const lista = selecionados.has(k) ? escolhidos : [no];
        // Só se arrasta o que veio do lado do cliente.
        if (!lista.every((n) => n.do_cliente))
            return e.preventDefault();
        if (!selecionados.has(k))
            setSelecionados(new Set([k]));
        setArrastados(lista);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(ARRASTO, lista.map(chave).join(","));
    }
    async function moverPara(lista, pastaId) {
        try {
            for (const n of lista)
                await api.mudar(n.tipo, n.id, { pastaId });
            const destino = pastaId ? (drive?.pastas.find((p) => p.id === pastaId)?.nome ?? "a pasta") : "a Drive";
            setAviso(lista.length === 1 ? `"${lista[0].nome}" foi para ${destino}.` : `${lista.length} itens foram para ${destino}.`);
            setSelecionados(new Set());
        }
        catch (e) {
            setAviso(e.message);
        }
        carregar();
    }
    /** As pastas e o caminho recebem o que se arrasta. */
    const alvoDe = (pastaId) => ({
        onDragOver: (e) => {
            if (!e.dataTransfer.types.includes(ARRASTO) || !aceita(pastaId))
                return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setAlvo(pastaId ?? "raiz");
        },
        onDragLeave: (e) => {
            if (!e.currentTarget.contains(e.relatedTarget))
                setAlvo((a) => (a === (pastaId ?? "raiz") ? null : a));
        },
        onDrop: (e) => {
            if (!e.dataTransfer.types.includes(ARRASTO))
                return;
            e.preventDefault();
            e.stopPropagation();
            const lista = arrastados;
            setArrastados(null);
            setAlvo(null);
            if (lista?.length && aceita(pastaId))
                void moverPara(lista, pastaId);
        },
    });
    const realce = (pastaId) => (alvo === (pastaId ?? "raiz") ? "mube:bg-primary/10 mube:ring-2 mube:ring-primary" : "");
    return (_jsxs("div", { className: "mube:relative mube:flex mube:min-h-0 mube:flex-1 mube:flex-col", onDragOver: (e) => {
            if (!e.dataTransfer.types.includes("Files"))
                return;
            e.preventDefault();
            setSobre(true);
        }, onDragLeave: (e) => e.currentTarget === e.target && setSobre(false), onDrop: (e) => {
            e.preventDefault();
            setSobre(false);
            if (e.dataTransfer.files.length)
                enviar([...e.dataTransfer.files]);
        }, children: [_jsxs("div", { className: "mube:flex mube:flex-wrap mube:items-center mube:gap-2 mube:px-4 mube:pt-4 mube:pb-2 mube:md:px-6", children: [_jsxs("nav", { "aria-label": "Caminho", className: "mube:flex mube:min-w-0 mube:flex-1 mube:items-center mube:gap-1", children: [_jsx("button", { type: "button", onClick: () => irPara(null), ...alvoDe(null), className: `mube:rounded-md mube:px-1 mube:text-h4 ${caminho.length ? "mube:text-muted-foreground mube:hover:text-foreground" : "mube:text-primary"} ${realce(null)}`, children: "Drive" }), caminho.map((p, i) => (_jsxs("span", { className: "mube:flex mube:min-w-0 mube:items-center mube:gap-1", children: [_jsx(Icone, { nome: "Chevron right", className: "mube:text-muted-foreground" }), _jsx("button", { type: "button", onClick: () => irPara(p.id), ...alvoDe(p.id), className: `mube:truncate mube:rounded-md mube:px-1 mube:text-h4 ${i === caminho.length - 1 ? "mube:text-primary" : "mube:text-muted-foreground mube:hover:text-foreground"} ${realce(p.id)}`, children: p.nome })] }, p.id)))] }), _jsx(Botao, { estilo: "secundario", icone: "Folder plus", onClick: () => setJanela({ tipo: "nova" }), children: "Nova pasta" }), _jsx(Botao, { icone: "Upload", onClick: () => entrada.current?.click(), children: "Enviar" }), _jsx("input", { ref: entrada, type: "file", multiple: true, hidden: true, onChange: (e) => {
                            if (e.target.files?.length)
                                enviar([...e.target.files]);
                            e.target.value = "";
                        } })] }), aviso && (_jsxs("p", { role: "status", className: "mube:mx-4 mube:flex mube:items-center mube:gap-2 mube:rounded-xl mube:bg-muted mube:px-3 mube:py-2 mube:text-body-sm mube:text-foreground mube:md:mx-6", children: [_jsx("span", { className: "mube:flex-1", children: aviso }), _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar o aviso", onClick: () => setAviso(null) })] })), erro ? (_jsx(ErroAoCarregar, { texto: erro, aoTentar: carregar })) : !drive ? (_jsx("div", { className: "mube:grid mube:grid-cols-2 mube:gap-3 mube:p-4 mube:sm:grid-cols-3 mube:md:grid-cols-6 mube:md:px-6", "aria-busy": "true", children: Array.from({ length: 6 }, (_, i) => (_jsx(Esqueleto, { className: "mube:h-36" }, i))) })) : nos.length === 0 ? (_jsx(Vazio, { icone: "Folder", titulo: atual ? "Pasta vazia" : "A Drive está vazia", texto: "Envie ficheiros para partilhar com a equipa. Tamb\u00E9m pode arrast\u00E1-los para aqui.", acao: _jsx(Botao, { icone: "Upload", onClick: () => entrada.current?.click(), children: "Enviar ficheiros" }) })) : (_jsx("ul", { ref: grelha, onPointerDown: comecarRetangulo, onPointerMove: moverRetangulo, onPointerUp: acabarRetangulo, onPointerCancel: acabarRetangulo, onClick: (e) => {
                    // Depois de um retângulo, o clique não limpa o que se escolheu.
                    if (arrastou.current)
                        return void (arrastou.current = false);
                    if (!e.target.closest("[data-chave], button"))
                        setSelecionados(new Set());
                }, className: `mube:grid mube:min-h-0 mube:flex-1 mube:grid-cols-2 mube:content-start mube:gap-3 mube:overflow-y-auto mube:p-4 mube:sm:grid-cols-3 mube:md:grid-cols-[repeat(auto-fill,minmax(142px,1fr))] mube:md:px-6 ${retangulo ? "mube:select-none" : ""} ${escolhidos.length ? "mube:pb-24" : ""}`, children: nos.map((no) => (_jsx("li", { className: "mube:animar-entrar", children: _jsx(Cartao, { no: no, meta: no.tipo === "pasta" ? `${contar(no.id)} ${contar(no.id) === 1 ? "item" : "itens"}` : `${tamanho(no.tamanho_bytes)} · ${dia(no.criado_em)}`, selecionado: selecionados.has(chave(no)), aArrastar: Boolean(arrastados?.some((a) => chave(a) === chave(no))), alvo: no.tipo === "pasta" && alvo === no.id, aoClicar: (e) => clicar(no, e), aoAbrir: () => abrir(no), arrasto: {
                            draggable: no.do_cliente,
                            onDragStart: (e) => comecarArrasto(no, e),
                            onDragEnd: () => {
                                setArrastados(null);
                                setAlvo(null);
                            },
                            ...(no.tipo === "pasta" ? alvoDe(no.id) : {}),
                        }, aoDescarregar: no.tipo === "item" ? () => abrir(no, true) : undefined, aoMudarNome: no.do_cliente ? () => setJanela({ tipo: "nome", no }) : undefined, aoMover: no.do_cliente ? () => setJanela({ tipo: "mover", nos: [no] }) : undefined, aoEliminar: no.do_cliente ? () => setJanela({ tipo: "eliminar", nos: [no] }) : undefined }) }, no.id))) })), retangulo && (_jsx("div", { "aria-hidden": true, className: "mube:pointer-events-none mube:fixed mube:z-30 mube:rounded-md mube:border mube:border-primary/60 mube:bg-primary/10", style: retangulo })), escolhidos.length > 0 && (_jsxs("div", { className: "mube:absolute mube:bottom-4 mube:left-1/2 mube:z-20 mube:flex mube:-translate-x-1/2 mube:items-center mube:gap-1 mube:rounded-full mube:bg-primary mube:py-1.5 mube:pr-1.5 mube:pl-4 mube:text-primary-foreground mube:shadow-soft-5 mube:animar-entrar", children: [_jsx("span", { className: "mube:mr-2 mube:text-label-sm mube:whitespace-nowrap", children: escolhidos.length === 1 ? "1 selecionado" : `${escolhidos.length} selecionados` }), _jsxs("button", { type: "button", disabled: !todosMeus, title: todosMeus ? undefined : "Só pode mover o que enviou", onClick: () => setJanela({ tipo: "mover", nos: escolhidos }), className: "mube:flex mube:h-8 mube:items-center mube:gap-1.5 mube:rounded-full mube:px-3 mube:text-label-sm mube:transition-colors mube:hover:bg-white/15 mube:disabled:opacity-40", children: [_jsx(Icone, { nome: "Move" }), " Mover"] }), _jsxs("button", { type: "button", disabled: !todosMeus, title: todosMeus ? undefined : "Só pode eliminar o que enviou", onClick: () => setJanela({ tipo: "eliminar", nos: escolhidos }), className: "mube:flex mube:h-8 mube:items-center mube:gap-1.5 mube:rounded-full mube:px-3 mube:text-label-sm mube:transition-colors mube:hover:bg-white/15 mube:disabled:opacity-40", children: [_jsx(Icone, { nome: "Trash" }), " Eliminar"] }), _jsx("button", { type: "button", onClick: () => setSelecionados(new Set()), "aria-label": "Limpar a sele\u00E7\u00E3o", className: "mube:flex mube:size-8 mube:items-center mube:justify-center mube:rounded-full mube:transition-colors mube:hover:bg-white/15", children: _jsx(Icone, { nome: "X" }) })] })), sobre && (_jsx("div", { className: "mube:pointer-events-none mube:absolute mube:inset-3 mube:flex mube:items-center mube:justify-center mube:rounded-2xl mube:border-2 mube:border-dashed mube:border-primary mube:bg-card/85", children: _jsxs("p", { className: "mube:flex mube:items-center mube:gap-2 mube:text-label-strong mube:text-foreground", children: [_jsx(Icone, { nome: "Upload" }), " Solte para enviar ", caminho.length ? `para ${caminho.at(-1).nome}` : "para a Drive"] }) })), envios.length > 0 && (_jsxs("aside", { "aria-label": "Envios", className: "mube:absolute mube:right-4 mube:bottom-4 mube:left-4 mube:flex mube:flex-col mube:gap-2 mube:rounded-2xl mube:bg-card mube:p-3 mube:shadow-soft-5 mube:animar-entrar mube:md:left-auto mube:md:w-80", children: [_jsxs("p", { className: "mube:flex mube:items-center mube:justify-between mube:text-label-strong mube:text-foreground", children: [envios.some((e) => e.estado === "a_enviar") ? "A enviar…" : "Envio concluído", !envios.some((e) => e.estado === "a_enviar") && _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar", onClick: () => setEnvios([]) })] }), _jsx("ul", { className: "mube:flex mube:max-h-48 mube:flex-col mube:gap-2 mube:overflow-y-auto", children: envios.map((e) => (_jsxs("li", { className: "mube:flex mube:items-center mube:gap-2", children: [_jsx(Ficheiro, { nome: e.nome, tamanho: 24 }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col mube:gap-1", children: [_jsx("span", { className: "mube:truncate mube:text-label-sm mube:text-foreground", children: e.nome }), e.estado === "a_enviar" ? (_jsx("span", { className: "mube:h-1 mube:overflow-hidden mube:rounded-full mube:bg-muted", children: _jsx("span", { className: "mube:block mube:h-full mube:bg-primary mube:transition-[width]", style: { width: `${Math.max(4, e.progresso * 100)}%` } }) })) : e.estado === "falhou" ? (_jsx("span", { className: "mube:text-body-xs mube:text-status-error", children: e.erro })) : null] }), e.estado === "feito" && _jsx(Icone, { nome: "Check circle", className: "mube:text-status-success" }), e.estado === "falhou" && _jsx(Icone, { nome: "Alert", className: "mube:text-status-error" })] }, e.chave))) })] })), janela?.tipo === "nova" && (_jsx(JanelaDeNome, { titulo: "Nova pasta", rotuloDoBotao: "Criar pasta", aoFechar: () => setJanela(null), aoGuardar: async (nome) => {
                    await api.criarPasta(nome, atual);
                    carregar();
                } })), janela?.tipo === "nome" && (_jsx(JanelaDeNome, { titulo: "Mudar o nome", rotuloDoBotao: "Guardar", inicial: janela.no.nome, aoFechar: () => setJanela(null), aoGuardar: async (nome) => {
                    await api.mudar(janela.no.tipo, janela.no.id, { nome });
                    carregar();
                } })), janela?.tipo === "mover" && drive && (_jsx(JanelaMover, { drive: drive, nos: janela.nos, aoFechar: () => setJanela(null), aoFeito: () => {
                    setSelecionados(new Set());
                    carregar();
                } })), janela?.tipo === "eliminar" && (_jsx(JanelaEliminar, { nos: janela.nos, aoFechar: () => setJanela(null), aoFeito: () => {
                    setAviso(janela.nos.length === 1 ? `"${janela.nos[0].nome}" saiu da sua vista.` : `${janela.nos.length} itens saíram da sua vista.`);
                    setSelecionados(new Set());
                    carregar();
                } }))] }));
}
function Cartao({ no, meta, selecionado, aArrastar, alvo, aoClicar, arrasto, aoAbrir, aoDescarregar, aoMudarNome, aoMover, aoEliminar, }) {
    // O menu abre num portal, fixo no ecrã: dentro da grelha (com scroll) ficava cortado.
    const [menu, setMenu] = useState(null);
    const caixa = useRef(null);
    const lista = useRef(null);
    useEffect(() => {
        if (!menu)
            return;
        const fora = (e) => !caixa.current?.contains(e.target) && !lista.current?.contains(e.target) && setMenu(null);
        const fechar = () => setMenu(null);
        document.addEventListener("mousedown", fora);
        window.addEventListener("wheel", fechar, { passive: true });
        window.addEventListener("resize", fechar);
        return () => {
            document.removeEventListener("mousedown", fora);
            window.removeEventListener("wheel", fechar);
            window.removeEventListener("resize", fechar);
        };
    }, [menu]);
    // Encosta-se ao botão, sem sair do ecrã (mexe no estilo antes de pintar).
    useLayoutEffect(() => {
        const el = lista.current;
        if (!menu || !el)
            return;
        const r = el.getBoundingClientRect();
        el.style.left = `${Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8))}px`;
        el.style.top = `${menu.y + r.height > window.innerHeight - 8 ? Math.max(8, menu.y - r.height - 40) : menu.y}px`;
    }, [menu]);
    const opcoes = [
        { rotulo: "Abrir", icone: "View", fazer: aoAbrir },
        aoDescarregar && { rotulo: "Descarregar", icone: "Download", fazer: aoDescarregar },
        aoMudarNome && { rotulo: "Mudar o nome", icone: "Edit", fazer: aoMudarNome },
        aoMover && { rotulo: "Mover", icone: "Move", fazer: aoMover },
        aoEliminar && { rotulo: "Eliminar", icone: "Trash", fazer: aoEliminar, perigo: true },
    ].filter(Boolean);
    return (_jsxs("div", { ref: caixa, className: "mube:group mube:relative", children: [_jsxs("button", { type: "button", "data-chave": chave(no), "aria-pressed": selecionado, onClick: aoClicar, onDoubleClick: aoAbrir, ...arrasto, className: `mube:flex mube:h-[142px] mube:w-full mube:flex-col mube:items-center mube:gap-2 mube:rounded-xl mube:border mube:px-2 mube:pt-8 mube:pb-3 mube:text-center mube:transition-[box-shadow,background-color,opacity] mube:duration-200 mube:select-none mube:hover:shadow-soft-3 mube:focus-visible:shadow-focus ${alvo
                    ? "mube:border-primary mube:bg-primary/10 mube:ring-2 mube:ring-primary"
                    : selecionado
                        ? "mube:border-primary mube:bg-primary/[0.06] mube:ring-[1.5px] mube:ring-primary"
                        : "mube:border-border mube:bg-card"} ${aArrastar ? "mube:opacity-50" : ""}`, children: [no.tipo === "pasta" ? _jsx(Pasta, { largura: 52 }) : _jsx(Ficheiro, { nome: no.nome, tipoMime: no.tipo_mime, tamanho: 48 }), _jsx("span", { className: "mube:mt-auto mube:line-clamp-2 mube:w-full mube:text-label-sm mube:break-words mube:text-foreground", children: no.nome }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: meta })] }), _jsx("span", { className: "mube:pointer-events-none mube:absolute mube:top-2 mube:left-2 mube:rounded-full mube:border mube:border-border mube:bg-muted mube:px-1.5 mube:text-body-xs mube:text-muted-foreground", children: no.do_cliente ? "Você" : "Mube" }), _jsx("button", { type: "button", "aria-label": `Opções de ${no.nome}`, "aria-expanded": Boolean(menu), onClick: (e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    // Dentro do .mube-c, para o menu ter os estilos do componente.
                    const raiz = e.currentTarget.closest(".mube-c");
                    if (raiz)
                        setMenu((m) => (m ? null : { x: r.left, y: r.bottom + 4, raiz }));
                }, className: "mube:absolute mube:top-1.5 mube:right-1.5 mube:flex mube:size-7 mube:items-center mube:justify-center mube:rounded-full mube:text-muted-foreground mube:transition-colors mube:hover:bg-muted mube:hover:text-foreground", children: _jsx(Icone, { nome: "More" }) }), menu &&
                createPortal(_jsxs("ul", { ref: lista, role: "menu", style: { left: menu.x, top: menu.y }, className: "mube:fixed mube:z-[2147483002] mube:flex mube:min-w-44 mube:flex-col mube:rounded-xl mube:border mube:border-border mube:bg-popover mube:p-1 mube:shadow-soft-5 mube:animar-entrar", children: [opcoes.map((o) => (_jsx("li", { children: _jsxs("button", { type: "button", role: "menuitem", onClick: () => {
                                    setMenu(null);
                                    o.fazer();
                                }, className: `mube:flex mube:w-full mube:items-center mube:gap-2.5 mube:rounded-lg mube:px-2.5 mube:py-1.5 mube:text-body-sm ${o.perigo ? "mube:text-destructive mube:hover:bg-destructive/10" : "mube:text-foreground mube:hover:bg-muted"}`, children: [_jsx(Icone, { nome: o.icone }), o.rotulo] }) }, o.rotulo))), !aoMudarNome && _jsx("li", { className: "mube:px-2.5 mube:pt-1 mube:pb-1.5 mube:text-body-xs mube:text-muted-foreground", children: "Enviado pela Mube: s\u00F3 leitura." })] }), menu.raiz)] }));
}
function JanelaDeNome({ titulo, rotuloDoBotao, inicial = "", aoFechar, aoGuardar }) {
    const [nome, setNome] = useState(inicial);
    const [erro, setErro] = useState(null);
    const [aGuardar, setAGuardar] = useState(false);
    async function guardar() {
        if (!nome.trim())
            return;
        setAGuardar(true);
        try {
            await aoGuardar(nome.trim());
            aoFechar();
        }
        catch (e) {
            setErro(e.message);
            setAGuardar(false);
        }
    }
    return (_jsxs(Janela, { titulo: titulo, aoFechar: aoFechar, largura: "mube:md:w-[420px]", rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Cancelar" }), _jsx(Botao, { "data-principal": true, aCarregar: aGuardar, disabled: !nome.trim() || nome.trim() === inicial, onClick: guardar, children: rotuloDoBotao })] }), children: [_jsx("input", { value: nome, maxLength: 120, "aria-label": "Nome", onChange: (e) => {
                    setNome(e.target.value);
                    setErro(null);
                }, onKeyDown: (e) => e.key === "Enter" && (e.preventDefault(), void guardar()), className: `mube:h-10 mube:w-full mube:rounded-full mube:border mube:bg-card mube:px-3 mube:text-body-sm mube:text-foreground mube:focus:border-foreground mube:focus:shadow-input-focus mube:focus:outline-none ${erro ? "mube:border-destructive" : "mube:border-input"}` }), erro && _jsx("p", { className: "mube:text-body-xs mube:text-destructive", children: erro })] }));
}
function JanelaMover({ drive, nos, aoFechar, aoFeito }) {
    const { api } = useSuporte();
    // Todos vêm da mesma pasta (a que está aberta).
    const de = nos[0]?.pasta_id ?? null;
    const [destino, setDestino] = useState(de);
    const [erro, setErro] = useState(null);
    const [aGuardar, setAGuardar] = useState(false);
    // Uma pasta não vai para dentro de si nem das suas.
    const proibidas = new Set();
    const pilha = nos.filter((n) => n.tipo === "pasta").map((n) => n.id);
    while (pilha.length) {
        const id = pilha.pop();
        proibidas.add(id);
        pilha.push(...drive.pastas.filter((p) => p.pasta_id === id).map((p) => p.id));
    }
    const arvore = [];
    const descer = (pai, nivel) => {
        for (const p of drive.pastas.filter((x) => x.pasta_id === pai).sort((a, b) => a.nome.localeCompare(b.nome, "pt"))) {
            if (proibidas.has(p.id))
                continue;
            arvore.push({ pasta: p, nivel });
            descer(p.id, nivel + 1);
        }
    };
    descer(null, 1);
    async function mover() {
        setAGuardar(true);
        try {
            for (const n of nos)
                await api.mudar(n.tipo, n.id, { pastaId: destino });
            aoFeito();
            aoFechar();
        }
        catch (e) {
            setErro(e.message);
            setAGuardar(false);
        }
    }
    const opcao = (id, nome, nivel) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setDestino(id), "aria-pressed": destino === id, style: { paddingLeft: 8 + nivel * 16 }, className: `mube:flex mube:w-full mube:items-center mube:gap-2 mube:rounded-lg mube:py-1.5 mube:pr-2 mube:text-body-sm ${destino === id ? "mube:bg-muted mube:font-semibold mube:text-foreground" : "mube:text-foreground mube:hover:bg-muted"}`, children: [_jsx(Pasta, { largura: 18 }), nome] }) }, id ?? "raiz"));
    return (_jsxs(Janela, { titulo: nos.length === 1 ? `Mover "${nos[0].nome}"` : `Mover ${nos.length} itens`, aoFechar: aoFechar, largura: "mube:md:w-[440px]", rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Cancelar" }), _jsx(Botao, { "data-principal": true, aCarregar: aGuardar, disabled: destino === de, onClick: mover, children: "Mover para aqui" })] }), children: [_jsxs("ul", { className: "mube:flex mube:max-h-[45dvh] mube:flex-col mube:overflow-y-auto mube:rounded-xl mube:border mube:border-border mube:p-1", children: [opcao(null, "Drive", 0), arvore.map((a) => opcao(a.pasta.id, a.pasta.nome, a.nivel))] }), erro && _jsx("p", { className: "mube:text-body-xs mube:text-destructive", children: erro })] }));
}
function JanelaEliminar({ nos, aoFechar, aoFeito }) {
    const { api } = useSuporte();
    const [erro, setErro] = useState(null);
    const [aApagar, setAApagar] = useState(false);
    async function apagar() {
        setAApagar(true);
        try {
            for (const n of nos)
                await api.apagar(n.tipo, n.id);
            aoFeito();
            aoFechar();
        }
        catch (e) {
            setErro(e.message);
            setAApagar(false);
        }
    }
    return (_jsx(Janela, { titulo: nos.length === 1 ? `Eliminar "${nos[0].nome}"?` : `Eliminar ${nos.length} itens?`, descricao: nos.some((n) => n.tipo === "pasta")
            ? "O que eliminar, e o que estiver dentro das pastas, deixa de aparecer para si. A equipa mantém uma cópia guardada."
            : "Deixa de aparecer para si. A equipa mantém uma cópia guardada.", aoFechar: aoFechar, largura: "mube:md:w-[420px]", rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Cancelar" }), _jsx(Botao, { "data-principal": true, estilo: "destrutivo", aCarregar: aApagar, onClick: apagar, children: "Eliminar" })] }), children: erro && _jsx("p", { className: "mube:text-body-sm mube:text-destructive", children: erro }) }));
}
