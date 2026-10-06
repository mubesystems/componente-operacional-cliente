"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { useSuporte } from "./componente.js";
import { Botao, BotaoIcone, diaEHora, ErroAoCarregar, Esqueleto, haQuanto, Icone, Janela, Vazio } from "./ui.js";
import { MODELOS, ORDEM_DOS_MODELOS } from "../credenciais.js";
const WASH = {
    teal: "mube:bg-wash-teal",
    navy: "mube:bg-wash-navy",
    rose: "mube:bg-wash-rose",
    sepia: "mube:bg-wash-sepia",
    olive: "mube:bg-wash-olive",
    primary: "mube:bg-wash-neutral",
};
const GLOW = {
    teal: "mube:bg-glow-teal",
    navy: "mube:bg-glow-navy",
    rose: "mube:bg-glow-rose",
    sepia: "mube:bg-glow-sepia",
    olive: "mube:bg-glow-olive",
    primary: "",
};
const TILE = {
    teal: "mube:bg-tile-teal",
    navy: "mube:bg-tile-navy",
    rose: "mube:bg-tile-rose",
    sepia: "mube:bg-tile-sepia",
    olive: "mube:bg-tile-olive",
    primary: "mube:bg-tile-primary",
};
/**
 * O palco do cartão bento (Figma: Composição, estilo bento, 27:2): o wash do
 * tom, o glow por trás e o tile com o rim ao centro. O que vier em `children`
 * fica por cima (a etiqueta no canto).
 */
function Palco({ modelo, pequeno, children }) {
    const m = MODELOS[modelo] ?? MODELOS.acesso;
    return (_jsxs("div", { className: `mube:relative mube:w-full mube:overflow-hidden mube:bg-background ${pequeno ? "mube:h-[72px] mube:rounded-[8px]" : "mube:h-[150px] mube:rounded-[10px]"}`, children: [_jsx("div", { "aria-hidden": true, className: `mube:absolute mube:inset-0 ${WASH[m.tom]}` }), GLOW[m.tom] && (_jsx("div", { "aria-hidden": true, className: `mube:absolute ${pequeno ? "mube:top-[30%] mube:left-[58%] mube:size-[140px]" : "mube:top-[24%] mube:left-[60%] mube:size-[260px]"} ${GLOW[m.tom]}` })), _jsxs("span", { "aria-hidden": true, className: `mube:absolute mube:top-1/2 mube:left-1/2 mube:flex mube:-translate-x-1/2 mube:-translate-y-1/2 mube:items-center mube:justify-center mube:overflow-hidden mube:border mube:border-white/28 mube:text-white mube:shadow-tile-rim mube:transition-transform mube:duration-300 mube:ease-out mube:group-hover:scale-105 ${TILE[m.tom]} ${pequeno ? "mube:size-11 mube:rounded-[13px]" : "mube:size-[76px] mube:rounded-[20px]"}`, children: [_jsx("span", { className: "mube:absolute mube:inset-0 mube:bg-tile-gloss" }), _jsx(Icone, { nome: m.icone, tamanho: pequeno ? 20 : 36, className: "mube:relative" })] }), children] }));
}
/** O cartão bento: branco, o palco com 8 px à volta e o corpo por baixo. */
const CARTAO = "mube:group mube:flex mube:flex-col mube:overflow-hidden mube:rounded-[18px] mube:bg-card mube:p-2 mube:shadow-soft-4 mube:transition-shadow mube:duration-200 mube:hover:shadow-soft-5 mube:animar-entrar";
/**
 * Credenciais (S63): a equipa da Mube pede acessos (um domínio, a
 * Cloudflare, uma chave de API…) e quem tem acesso a esta secção envia-os.
 * Também se pode enviar por iniciativa própria. O que se envia fica cifrado
 * na plataforma; o valor só volta aqui a pedido ("Mostrar"), por um minuto,
 * e cada leitura fica na atividade que a equipa vê. Pode-se editar e retirar.
 */
export function Credenciais() {
    const { api, versao, avisos, recarregarAvisos } = useSuporte();
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState(null);
    const [formulario, setFormulario] = useState(null);
    const [retirar, setRetirar] = useState(null);
    const [aberta, setAberta] = useState(null);
    const carregar = useCallback(() => {
        api
            .credenciais()
            .then((d) => {
            setErro(null);
            setDados(d);
        })
            .catch((e) => setErro(e.message));
    }, [api]);
    useEffect(() => {
        carregar();
    }, [carregar, versao]);
    // Abrir a secção lê os avisos de pedidos de credenciais.
    useEffect(() => {
        const ids = avisos.filter((a) => !a.lida && a.tipo === "credencial").map((a) => a.id);
        if (ids.length)
            void api.marcarLidas(ids).then(recarregarAvisos).catch(() => undefined);
    }, [api, avisos, recarregarAvisos]);
    if (erro)
        return _jsx(ErroAoCarregar, { texto: erro, aoTentar: carregar });
    const adicionar = (_jsx(Botao, { icone: "Plus", onClick: () => setFormulario({ modo: "novo", modelo: null }), children: "Adicionar" }));
    return (_jsxs("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col mube:overflow-y-auto", children: [_jsxs("div", { className: "mube:mx-auto mube:flex mube:w-full mube:max-w-[760px] mube:flex-col mube:gap-5 mube:px-4 mube:py-5", children: [_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-3 mube:sm:flex-row mube:sm:items-end", children: [_jsxs("div", { className: "mube:flex mube:flex-1 mube:flex-col mube:gap-1", children: [_jsx("h2", { className: "mube:text-h4 mube:text-foreground", children: "Credenciais" }), _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: "Envie \u00E0 equipa da Mube os acessos de que ela precisa. Ficam cifrados; pode v\u00EA-los, edit\u00E1-los ou retir\u00E1-los aqui, e cada vez que algu\u00E9m os v\u00EA fica registado." })] }), adicionar] }), !dados ? (_jsx("div", { className: "mube:grid mube:gap-2 mube:sm:grid-cols-2", "aria-busy": "true", children: [0, 1, 2, 3].map((i) => (_jsx(Esqueleto, { className: "mube:h-[76px] mube:w-full mube:rounded-2xl" }, i))) })) : dados.pedidos.length === 0 && dados.enviadas.length === 0 ? (_jsx(Vazio, { icone: "Key", titulo: "Ainda sem credenciais", texto: "Quando a equipa da Mube precisar de um acesso (o dom\u00EDnio, a Cloudflare, uma chave de API\u2026), o pedido aparece aqui. Tamb\u00E9m pode enviar um por iniciativa sua.", acao: adicionar })) : (_jsxs(_Fragment, { children: [dados.pedidos.length > 0 && (_jsxs("section", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsxs("h3", { className: "mube:flex mube:items-center mube:gap-2 mube:text-label-strong mube:text-foreground", children: ["Pedidos da equipa", _jsx("span", { className: "mube:rounded-full mube:bg-primary mube:px-1.5 mube:text-label-sm mube:text-primary-foreground", children: dados.pedidos.length })] }), _jsx("ul", { className: "mube:grid mube:items-start mube:gap-4 mube:sm:grid-cols-2", children: dados.pedidos.map((p) => (_jsxs("li", { className: CARTAO, children: [_jsx(Palco, { modelo: p.modelo, children: _jsxs("span", { className: "mube:absolute mube:top-2.5 mube:left-2.5 mube:inline-flex mube:h-6 mube:items-center mube:gap-1.5 mube:rounded-full mube:bg-card/90 mube:px-2.5 mube:text-label-sm mube:text-foreground mube:shadow-soft-2", children: [_jsx("span", { "aria-hidden": true, className: "mube:size-1.5 mube:rounded-full mube:bg-status-warning" }), "Por preencher"] }) }), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1.5 mube:px-3 mube:pt-3.5 mube:pb-3", children: [_jsx("span", { className: "mube:text-h4 mube:text-foreground", children: p.titulo }), p.descricao && _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: p.descricao }), _jsxs("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: [MODELOS[p.modelo]?.nome, " \u00B7 pedido por ", p.pedido_por.nome, " \u00B7 ", haQuanto(p.criado_em)] }), _jsx(Botao, { tamanho: "sm", icone: "Cadeado", className: "mube:mt-1.5 mube:self-start", onClick: () => setFormulario({ modo: "novo", modelo: p.modelo, pedido: p }), children: "Preencher" })] })] }, p.id))) })] })), dados.enviadas.length > 0 && (_jsxs("section", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("h3", { className: "mube:text-label-strong mube:text-foreground", children: "Enviadas" }), _jsx("ul", { className: "mube:grid mube:items-start mube:gap-4 mube:sm:grid-cols-2", children: dados.enviadas.map((c) => (_jsx("li", { className: CARTAO, children: _jsxs("button", { type: "button", onClick: () => setAberta(c), "aria-label": `Abrir ${c.nome}`, className: "mube:flex mube:flex-col mube:rounded-[10px] mube:text-left mube:focus-visible:shadow-focus", children: [_jsx(Palco, { modelo: c.modelo }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-col mube:gap-0.5 mube:px-3 mube:pt-3.5 mube:pb-3", children: [_jsx("span", { className: "mube:truncate mube:text-h4 mube:text-foreground", children: c.nome }), _jsx("span", { className: "mube:truncate mube:text-body-xs mube:text-muted-foreground", children: c.url ? c.url.replace(/^https?:\/\//, "") : MODELOS[c.modelo]?.nome }), _jsxs("span", { className: "mube:mt-1 mube:flex mube:items-center mube:gap-1.5 mube:text-body-xs mube:text-muted-foreground", children: [_jsx("span", { "aria-hidden": true, className: "mube:size-1.5 mube:rounded-full mube:bg-status-success" }), c.atualizada_em !== c.enviada_em ? `Editada ${haQuanto(c.atualizada_em)}` : `Enviada ${haQuanto(c.enviada_em)}`, c.enviada_por.nome ? ` por ${c.enviada_por.nome.split(" ")[0]}` : ""] })] })] }) }, c.id))) })] }))] }))] }), formulario && (_jsx(JanelaDaCredencial, { formulario: formulario, aoFechar: () => setFormulario(null), aoEnviar: () => {
                    setFormulario(null);
                    setAberta(null);
                    carregar();
                } })), aberta && !formulario && !retirar && (_jsx(FolhaDaCredencial, { credencial: aberta, aoFechar: () => setAberta(null), aoEditar: (conteudo) => setFormulario({ modo: "editar", credencial: aberta, conteudo }), aoRetirar: () => setRetirar(aberta) })), retirar && (_jsx(JanelaRetirar, { credencial: retirar, aoFechar: () => setRetirar(null), aoRetirar: () => {
                    setRetirar(null);
                    setAberta(null);
                    carregar();
                } }))] }));
}
const CAMPO = "mube:h-10 mube:w-full mube:rounded-full mube:border mube:border-input mube:bg-card mube:px-4 mube:text-body-sm mube:text-foreground mube:placeholder:text-muted-foreground mube:focus:border-foreground mube:focus:shadow-input-focus mube:focus:outline-none";
const AREA = "mube:w-full mube:resize-none mube:rounded-2xl mube:border mube:border-input mube:bg-card mube:px-4 mube:py-2.5 mube:text-body-sm mube:text-foreground mube:placeholder:text-muted-foreground mube:focus:border-foreground mube:focus:shadow-input-focus mube:focus:outline-none";
function Campo({ rotulo, children }) {
    return (_jsxs("label", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [_jsx("span", { className: "mube:text-label-sm mube:text-foreground", children: rotulo }), children] }));
}
function JanelaDaCredencial({ formulario, aoFechar, aoEnviar }) {
    const { api } = useSuporte();
    const inicial = formulario.modo === "editar" ? formulario.credencial.modelo : formulario.modelo;
    const antes = formulario.modo === "editar" ? formulario.conteudo : {};
    const [modelo, setModelo] = useState(inicial);
    const m = modelo ? MODELOS[modelo] : null;
    const pedido = formulario.modo === "novo" ? formulario.pedido : undefined;
    const [nome, setNome] = useState(formulario.modo === "editar" ? formulario.credencial.nome : (pedido?.titulo ?? m?.nomeFixo ?? ""));
    const [url, setUrl] = useState(formulario.modo === "editar" ? (formulario.credencial.url ?? "") : (m?.url ?? ""));
    const [registador, setRegistador] = useState(antes.registador ?? "");
    const [utilizador, setUtilizador] = useState(antes.utilizador ?? "");
    const [senha, setSenha] = useState(antes.senha ?? "");
    const [verSenha, setVerSenha] = useState(false);
    const [notas, setNotas] = useState(antes.notas ?? "");
    const [texto, setTexto] = useState(antes.texto ?? "");
    const [erro, setErro] = useState(null);
    const [aEnviar, setAEnviar] = useState(false);
    function escolher(novo) {
        setModelo(novo);
        setNome(MODELOS[novo].nomeFixo ?? "");
        setUrl(MODELOS[novo].url ?? "");
        setErro(null);
    }
    async function enviar() {
        if (!modelo || !m)
            return;
        setAEnviar(true);
        setErro(null);
        const campos = m.forma === "acesso" ? { utilizador, senha, notas, ...(m.registador ? { registador } : {}) } : { texto };
        try {
            if (formulario.modo === "editar")
                await api.editarCredencial(formulario.credencial.id, { nome, url, campos });
            else
                await api.enviarCredencial({ modelo, nome, url, campos, pedidoId: pedido?.id });
            aoEnviar();
        }
        catch (e) {
            setErro(e.message);
        }
        finally {
            setAEnviar(false);
        }
    }
    const titulo = formulario.modo === "editar" ? `Editar “${formulario.credencial.nome}”` : pedido ? pedido.titulo : m ? `Nova credencial: ${m.nome.toLowerCase()}` : "Nova credencial";
    return (_jsx(Janela, { titulo: titulo, largura: "mube:md:w-[560px]", descricao: !m
            ? "Escolha o que vai enviar."
            : formulario.modo === "editar"
                ? "Fica cifrado. A equipa da Mube é avisada da mudança."
                : (pedido?.descricao ?? "Fica cifrado. Só a equipa da Mube que trabalha no projeto o vê."), aoFechar: aoFechar, rodape: m ? (_jsxs(_Fragment, { children: [formulario.modo === "novo" && !pedido && (_jsx(Botao, { estilo: "fantasma", onClick: () => setModelo(null), className: "mube:md:mr-auto", children: "Voltar" })), _jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Cancelar" }), _jsx(Botao, { "data-principal": true, icone: "Cadeado", aCarregar: aEnviar, onClick: enviar, children: formulario.modo === "editar" ? "Guardar" : "Enviar cifrado" })] })) : undefined, children: !m ? (_jsx("div", { role: "radiogroup", className: "mube:grid mube:grid-cols-2 mube:gap-2 mube:sm:grid-cols-3", children: ORDEM_DOS_MODELOS.map((o) => (_jsxs("button", { type: "button", role: "radio", "aria-checked": false, onClick: () => escolher(o), className: "mube:group mube:flex mube:flex-col mube:gap-2 mube:rounded-[14px] mube:bg-card mube:p-1.5 mube:pb-2.5 mube:text-left mube:shadow-soft-3 mube:transition-all mube:duration-200 mube:hover:-translate-y-0.5 mube:hover:shadow-soft-4 mube:focus-visible:shadow-focus", children: [_jsx(Palco, { modelo: o, pequeno: true }), _jsxs("span", { className: "mube:flex mube:flex-col mube:gap-0.5 mube:px-1.5", children: [_jsx("span", { className: "mube:text-label mube:text-foreground", children: MODELOS[o].nome }), _jsx("span", { className: "mube:line-clamp-2 mube:text-body-xs mube:text-muted-foreground", children: MODELOS[o].descricao })] })] }, o))) })) : (_jsxs("form", { className: "mube:flex mube:flex-col mube:gap-3 mube:animar-entrar", autoComplete: "off", onSubmit: (e) => {
                e.preventDefault();
                void enviar();
            }, children: [_jsx(Palco, { modelo: modelo, pequeno: true }), _jsx(Campo, { rotulo: m.campoNome, children: _jsx("input", { className: CAMPO, value: nome, maxLength: 120, placeholder: m.exemploNome, onChange: (e) => setNome(e.target.value) }) }), m.forma === "acesso" ? (_jsxs(_Fragment, { children: [m.registador && (_jsx(Campo, { rotulo: "Onde est\u00E1 registado (opcional)", children: _jsx("input", { className: CAMPO, value: registador, maxLength: 120, placeholder: "PTisp, Amen, GoDaddy\u2026", onChange: (e) => setRegistador(e.target.value) }) })), _jsx(Campo, { rotulo: "Endere\u00E7o do painel (opcional)", children: _jsx("input", { className: CAMPO, value: url, placeholder: m.url ?? "https://…", onChange: (e) => setUrl(e.target.value) }) }), _jsx(Campo, { rotulo: "Utilizador ou e-mail", children: _jsx("input", { className: CAMPO, value: utilizador, autoComplete: "off", onChange: (e) => setUtilizador(e.target.value) }) }), _jsx(Campo, { rotulo: "Senha", children: _jsxs("span", { className: "mube:relative mube:block", children: [_jsx("input", { className: `${CAMPO} mube:pr-11 mube:font-mono`, type: verSenha ? "text" : "password", value: senha, autoComplete: "new-password", onChange: (e) => setSenha(e.target.value) }), _jsx("span", { className: "mube:absolute mube:top-1/2 mube:right-1 mube:-translate-y-1/2", children: _jsx(BotaoIcone, { icone: verSenha ? "View off" : "View", rotulo: verSenha ? "Esconder a senha" : "Mostrar a senha", onClick: () => setVerSenha((v) => !v) }) })] }) }), _jsx(Campo, { rotulo: "Notas (opcional)", children: _jsx("textarea", { className: AREA, rows: 3, value: notas, maxLength: 5000, placeholder: m.pistaNotas, onChange: (e) => setNotas(e.target.value) }) })] })) : (_jsx(Campo, { rotulo: m.forma === "chave" ? "Chave" : "Conteúdo", children: _jsx("textarea", { className: `${AREA} ${m.forma === "chave" ? "mube:font-mono" : ""}`, rows: m.forma === "chave" ? 3 : 6, spellCheck: false, value: texto, onChange: (e) => setTexto(e.target.value) }) })), _jsxs("p", { className: "mube:flex mube:items-start mube:gap-2 mube:text-body-xs mube:text-muted-foreground", children: [_jsx(Icone, { nome: "Cadeado", tamanho: 14, className: "mube:mt-px" }), "Cifrado ao chegar \u00E0 plataforma da Mube. Cada vez que algu\u00E9m da equipa o v\u00EA, fica registado."] }), erro && _jsx("p", { className: "mube:text-body-sm mube:text-destructive", children: erro })] })) }));
}
const ESCONDER_DEPOIS_MS = 60_000;
function Linha({ icone, rotulo, children }) {
    return (_jsxs("div", { className: "mube:flex mube:min-h-10 mube:items-center mube:gap-3 mube:border-b mube:border-border mube:py-1.5", children: [_jsxs("span", { className: "mube:flex mube:w-32 mube:shrink-0 mube:items-center mube:gap-2 mube:text-body-sm mube:text-muted-foreground", children: [_jsx(Icone, { nome: icone }), rotulo] }), _jsx("span", { className: "mube:min-w-0 mube:flex-1 mube:text-body-sm mube:text-foreground", children: children })] }));
}
function Valor({ rotulo, valor, segredo }) {
    const [ver, setVer] = useState(!segredo);
    const [copiado, setCopiado] = useState(false);
    return (_jsxs("div", { className: "mube:flex mube:items-center mube:gap-2 mube:rounded-xl mube:border mube:border-border mube:bg-muted/50 mube:py-1 mube:pr-1 mube:pl-3", children: [_jsx("span", { className: "mube:w-24 mube:shrink-0 mube:text-label-sm mube:text-muted-foreground", children: rotulo }), _jsx("span", { className: "mube:min-w-0 mube:flex-1 mube:truncate mube:font-mono mube:text-mono-sm mube:text-foreground", children: ver ? valor || "—" : "•".repeat(Math.min(valor.length, 16) || 8) }), segredo && _jsx(BotaoIcone, { icone: ver ? "View off" : "View", rotulo: ver ? "Esconder" : "Mostrar", onClick: () => setVer((v) => !v) }), _jsx(BotaoIcone, { icone: copiado ? "Tick" : "Copy", rotulo: `Copiar ${rotulo.toLowerCase()}`, onClick: () => void navigator.clipboard.writeText(valor).then(() => {
                    setCopiado(true);
                    window.setTimeout(() => setCopiado(false), 1500);
                }) })] }));
}
/**
 * A credencial enviada, numa folha lateral como o detalhe do ticket: as
 * propriedades e o valor, que só se decifra a pedido (fica registado na
 * atividade da equipa) e se esconde sozinho ao fim de um minuto.
 */
function FolhaDaCredencial({ credencial: c, aoFechar, aoEditar, aoRetirar, }) {
    const { api } = useSuporte();
    const m = MODELOS[c.modelo] ?? MODELOS.acesso;
    const [conteudo, setConteudo] = useState(null);
    const [aAbrir, setAAbrir] = useState(false);
    const [erro, setErro] = useState(null);
    useEffect(() => {
        if (!conteudo)
            return;
        const id = window.setTimeout(() => setConteudo(null), ESCONDER_DEPOIS_MS);
        return () => window.clearTimeout(id);
    }, [conteudo]);
    useEffect(() => {
        const tecla = (e) => e.key === "Escape" && (e.stopPropagation(), aoFechar());
        document.addEventListener("keydown", tecla, true);
        return () => document.removeEventListener("keydown", tecla, true);
    }, [aoFechar]);
    async function revelar(depois) {
        setAAbrir(true);
        setErro(null);
        try {
            const r = await api.revelarCredencial(c.id);
            setConteudo(r.conteudo);
            depois?.(r.conteudo);
        }
        catch (e) {
            setErro(e.message);
        }
        finally {
            setAAbrir(false);
        }
    }
    return (_jsx("div", { className: "mube:fixed mube:inset-0 mube:z-[2147483002] mube:flex mube:justify-end mube:bg-black/30 mube:md:p-2", onMouseDown: (e) => e.target === e.currentTarget && aoFechar(), children: _jsxs("aside", { "aria-label": c.nome, className: "mube:flex mube:h-full mube:w-full mube:flex-col mube:overflow-hidden mube:bg-card mube:shadow-soft-6 mube:animar-de-lado mube:md:w-[480px] mube:md:rounded-[20px]", children: [_jsxs("header", { className: "mube:flex mube:h-14 mube:shrink-0 mube:items-center mube:gap-2 mube:border-b mube:border-border mube:pr-3 mube:pl-4", children: [_jsx("h2", { className: "mube:min-w-0 mube:flex-1 mube:truncate mube:text-h4 mube:text-foreground", children: m.nome }), _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar", onClick: aoFechar })] }), _jsxs("div", { className: "mube:min-h-0 mube:flex-1 mube:overflow-y-auto", children: [_jsx("div", { className: "mube:p-2", children: _jsx(Palco, { modelo: c.modelo }) }), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-4 mube:px-5 mube:pt-3 mube:pb-5", children: [_jsx("h3", { className: "mube:text-h3 mube:text-foreground", children: c.nome }), _jsxs("section", { className: "mube:flex mube:flex-col", children: [_jsx(Linha, { icone: m.icone, rotulo: "Tipo", children: m.nome }), c.url && (_jsx(Linha, { icone: "Globo", rotulo: "Endere\u00E7o", children: _jsx("a", { href: c.url, target: "_blank", rel: "noreferrer", className: "mube:block mube:truncate mube:text-status-info mube:hover:underline", children: c.url.replace(/^https?:\/\//, "") }) })), _jsx(Linha, { icone: "Users", rotulo: "Enviada por", children: c.enviada_por.nome ?? "—" }), _jsx(Linha, { icone: "Clock", rotulo: c.atualizada_em !== c.enviada_em ? "Editada" : "Enviada", children: diaEHora(c.atualizada_em) })] }), _jsxs("section", { className: "mube:flex mube:flex-col mube:gap-2", children: [conteudo ? (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1.5 mube:animar-entrar", children: [conteudo.registador && _jsx(Valor, { rotulo: "Registado em", valor: conteudo.registador }), "texto" in conteudo && conteudo.texto !== undefined ? (m.forma === "chave" ? (_jsx(Valor, { rotulo: "Chave", valor: conteudo.texto, segredo: true })) : (_jsx("pre", { className: "mube:rounded-xl mube:border mube:border-border mube:bg-muted/50 mube:px-3 mube:py-2 mube:font-mono mube:text-mono-sm mube:whitespace-pre-wrap mube:text-foreground", children: conteudo.texto }))) : (_jsxs(_Fragment, { children: [_jsx(Valor, { rotulo: "Utilizador", valor: conteudo.utilizador ?? "" }), _jsx(Valor, { rotulo: "Senha", valor: conteudo.senha ?? "", segredo: true }), conteudo.notas && _jsx("p", { className: "mube:rounded-xl mube:bg-muted/50 mube:px-3 mube:py-2 mube:text-body-sm mube:whitespace-pre-wrap mube:text-foreground", children: conteudo.notas })] }))] })) : (_jsxs("p", { className: "mube:flex mube:items-center mube:gap-2 mube:rounded-xl mube:border mube:border-dashed mube:border-border mube:px-3 mube:py-3 mube:text-body-sm mube:text-muted-foreground", children: [_jsx(Icone, { nome: "Cadeado" }), "Cifrado. \u201CMostrar\u201D abre-o aqui por um minuto; a equipa v\u00EA que foi visto."] })), erro && _jsx("p", { className: "mube:text-body-sm mube:text-destructive", children: erro })] })] })] }), _jsxs("footer", { className: "mube:flex mube:shrink-0 mube:items-center mube:gap-2 mube:border-t mube:border-border mube:px-5 mube:py-3.5", children: [_jsx(Botao, { tamanho: "sm", icone: conteudo ? "View off" : "View", aCarregar: aAbrir, onClick: () => (conteudo ? setConteudo(null) : void revelar()), children: conteudo ? "Esconder" : "Mostrar" }), _jsx(Botao, { estilo: "secundario", tamanho: "sm", icone: "Edit", onClick: () => (conteudo ? aoEditar(conteudo) : void revelar(aoEditar)), children: "Editar" }), _jsx("span", { className: "mube:ml-auto", children: _jsx(BotaoIcone, { icone: "Trash", rotulo: `Retirar ${c.nome}`, onClick: aoRetirar }) })] })] }) }));
}
function JanelaRetirar({ credencial, aoFechar, aoRetirar }) {
    const { api } = useSuporte();
    const [aRetirar, setARetirar] = useState(false);
    const [erro, setErro] = useState(null);
    return (_jsx(Janela, { titulo: `Retirar “${credencial.nome}”?`, descricao: "A equipa da Mube deixa de a ver, e deixa de aparecer aqui. Se ainda tiver acesso com ela, conv\u00E9m tamb\u00E9m mudar a senha no servi\u00E7o.", aoFechar: aoFechar, rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Cancelar" }), _jsx(Botao, { "data-principal": true, estilo: "destrutivo", aCarregar: aRetirar, onClick: async () => {
                        setARetirar(true);
                        try {
                            await api.retirarCredencial(credencial.id);
                            aoRetirar();
                        }
                        catch (e) {
                            setErro(e.message);
                            setARetirar(false);
                        }
                    }, children: "Retirar" })] }), children: erro && _jsx("p", { className: "mube:text-body-sm mube:text-destructive", children: erro }) }));
}
