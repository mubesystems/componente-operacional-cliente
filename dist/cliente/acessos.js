"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSuporte } from "./componente.js";
import { Botao, ErroAoCarregar, Esqueleto, Icone, Vazio } from "./ui.js";
const iniciais = (nome) => nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i, l) => (i === 0 || i === l.length - 1 ? p[0] : ""))
    .join("")
    .toUpperCase() || "?";
/** O interruptor (Figma: Switch). */
function Interruptor({ ligado, aoMudar, rotulo, desligado }) {
    return (_jsx("button", { type: "button", role: "switch", "aria-checked": ligado, "aria-label": rotulo, disabled: desligado, onClick: aoMudar, className: `mube:relative mube:h-6 mube:w-10 mube:shrink-0 mube:rounded-full mube:transition-[background-color,opacity] mube:duration-200 mube:focus-visible:shadow-focus mube:focus-visible:outline-none mube:disabled:cursor-not-allowed mube:disabled:opacity-40 ${ligado ? "mube:bg-primary" : "mube:bg-input"}`, children: _jsx("span", { className: `mube:absolute mube:top-0.5 mube:left-0.5 mube:size-5 mube:rounded-full mube:bg-card mube:shadow-soft-2 mube:transition-transform mube:duration-200 ${ligado ? "mube:translate-x-4" : ""}` }) }));
}
/**
 * Acessos ao suporte (S14, S18): o gestor do software escolhe, da equipa dele,
 * quem pode reportar, acompanhar os pedidos e receber os avisos, e quem vê a
 * Drive (S59) e as credenciais (S63), só com o suporte. A escolha fica no
 * software do cliente e segue para a plataforma.
 */
export function Acessos() {
    const { api, sessao, recarregarSessao } = useSuporte();
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState(null);
    // Quem tem acesso ao suporte → se vê a Drive e as credenciais.
    const [escolhidos, setEscolhidos] = useState(new Map());
    const [busca, setBusca] = useState("");
    const [aGuardar, setAGuardar] = useState(false);
    const [aviso, setAviso] = useState(null);
    const carregar = useCallback(() => {
        api
            .acessos()
            .then((d) => {
            setErro(null);
            setDados(d);
            setEscolhidos(new Map(d.equipa.filter((p) => p.liberado).map((p) => [p.id, { drive: p.drive, credenciais: p.credenciais }])));
        })
            .catch((e) => setErro(e.message));
    }, [api]);
    useEffect(() => {
        carregar();
    }, [carregar]);
    const antes = useMemo(() => new Map(dados?.equipa.filter((p) => p.liberado).map((p) => [p.id, { drive: p.drive, credenciais: p.credenciais }]) ?? []), [dados]);
    const mudou = escolhidos.size !== antes.size || [...escolhidos].some(([id, e]) => antes.get(id)?.drive !== e.drive || antes.get(id)?.credenciais !== e.credenciais);
    const comDrive = [...escolhidos.values()].filter((e) => e.drive).length;
    const q = busca.trim().toLocaleLowerCase("pt");
    const visiveis = (dados?.equipa ?? []).filter((p) => !q || `${p.nome ?? ""} ${p.email ?? ""}`.toLocaleLowerCase("pt").includes(q));
    /** Dar o suporte dá também a Drive (que se pode tirar a seguir), mas não as credenciais; tirar o suporte tira tudo. */
    function alternar(id) {
        setAviso(null);
        setEscolhidos((s) => {
            const n = new Map(s);
            if (n.has(id))
                n.delete(id);
            else
                n.set(id, { drive: true, credenciais: false });
            return n;
        });
    }
    function alternarExtra(id, extra) {
        setAviso(null);
        setEscolhidos((s) => {
            const atual = s.get(id);
            return atual ? new Map(s).set(id, { ...atual, [extra]: !atual[extra] }) : s;
        });
    }
    async function guardar() {
        setAGuardar(true);
        setAviso(null);
        try {
            const r = await api.definirAcessos([...escolhidos].map(([id, e]) => ({ id, ...e })));
            const pessoas = (n) => (n === 1 ? "1 pessoa" : `${n} pessoas`);
            setAviso({
                tom: "ok",
                texto: `Guardado: ${pessoas(r.liberados)} com acesso ao suporte, ${r.comDrive ?? r.liberados} com a Drive, ${r.comCredenciais ?? 0} com as credenciais.`,
            });
            carregar();
            recarregarSessao();
        }
        catch (e) {
            setAviso({ tom: "erro", texto: e.message });
        }
        finally {
            setAGuardar(false);
        }
    }
    if (erro)
        return _jsx(ErroAoCarregar, { texto: erro, aoTentar: carregar });
    return (_jsxs("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col", children: [_jsx("div", { className: "mube:min-h-0 mube:flex-1 mube:overflow-y-auto", children: _jsxs("div", { className: "mube:mx-auto mube:flex mube:w-full mube:max-w-[640px] mube:flex-col mube:gap-4 mube:px-4 mube:py-5", children: [_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1", children: [_jsx("h2", { className: "mube:text-h4 mube:text-foreground", children: "Acessos ao suporte" }), _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: "Escolha quem da sua equipa pode reportar problemas, acompanhar os pedidos, aceitar as corre\u00E7\u00F5es e receber os avisos, quem v\u00EA a Drive com os ficheiros do projeto e quem envia as credenciais (dom\u00EDnios, acessos, chaves) que a equipa da Mube pedir." })] }), !dados ? (_jsx("div", { className: "mube:flex mube:flex-col mube:gap-2", "aria-busy": "true", children: [0, 1, 2, 3].map((i) => (_jsx(Esqueleto, { className: "mube:h-14 mube:w-full" }, i))) })) : dados.equipa.length === 0 ? (_jsx(Vazio, { icone: "Inbox", titulo: "Sem pessoas na equipa", texto: "Quando houver utilizadores no seu software, aparecem aqui para lhes dar acesso." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2 mube:sm:flex-row mube:sm:items-center", children: [_jsxs("label", { className: "mube:relative mube:flex-1", children: [_jsx("span", { className: "mube:sr-only", children: "Procurar pessoa" }), _jsx("input", { type: "search", value: busca, onChange: (e) => setBusca(e.target.value), placeholder: "Procurar por nome ou email", className: "mube:h-10 mube:w-full mube:rounded-full mube:border mube:border-input mube:bg-card mube:px-4 mube:text-body-sm mube:text-foreground mube:placeholder:text-muted-foreground mube:focus:border-foreground mube:focus:shadow-input-focus mube:focus:outline-none" })] }), _jsxs("span", { className: "mube:flex mube:items-center mube:gap-2", children: [_jsxs("span", { className: "mube:text-body-sm mube:whitespace-nowrap mube:text-muted-foreground", children: [escolhidos.size, " de ", dados.equipa.length, " com acesso \u00B7 ", comDrive, " com Drive"] }), _jsx(Botao, { estilo: "fantasma", tamanho: "sm", onClick: () => {
                                                        setAviso(null);
                                                        setEscolhidos(escolhidos.size === dados.equipa.length ? new Map() : new Map(dados.equipa.map((p) => [p.id, escolhidos.get(p.id) ?? { drive: true, credenciais: false }])));
                                                    }, children: escolhidos.size === dados.equipa.length ? "Tirar todos" : "Dar a todos" })] })] }), _jsxs("ul", { className: "mube:flex mube:flex-col mube:overflow-hidden mube:rounded-2xl mube:border mube:border-border", children: [_jsxs("li", { "aria-hidden": true, className: "mube:flex mube:items-center mube:gap-3 mube:border-b mube:border-border mube:bg-muted mube:px-3 mube:py-1.5 mube:text-label-sm mube:text-muted-foreground", children: [_jsx("span", { className: "mube:flex-1", children: "Pessoa" }), _jsx("span", { className: "mube:w-14 mube:text-center", children: "Suporte" }), _jsx("span", { className: "mube:w-14 mube:text-center", children: "Drive" }), _jsx("span", { className: "mube:w-[4.5rem] mube:text-center", children: "Credenciais" })] }), visiveis.map((p) => {
                                            const ligado = escolhidos.has(p.id);
                                            const comADrive = ligado && escolhidos.get(p.id)?.drive === true;
                                            const comCredenciais = ligado && escolhidos.get(p.id)?.credenciais === true;
                                            const nome = p.nome ?? p.email ?? p.id;
                                            return (_jsxs("li", { className: "mube:flex mube:items-center mube:gap-3 mube:border-b mube:border-border mube:px-3 mube:py-2.5 mube:transition-colors mube:duration-150 mube:last:border-b-0 mube:hover:bg-muted/60", children: [_jsx("span", { className: "mube:flex mube:size-8 mube:shrink-0 mube:items-center mube:justify-center mube:overflow-hidden mube:rounded-full mube:border mube:border-border mube:bg-muted mube:text-label-sm mube:text-muted-foreground", children: p.fotoUrl ? _jsx("img", { src: p.fotoUrl, alt: "", className: "mube:size-full mube:object-cover" }) : iniciais(nome) }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsxs("span", { className: "mube:truncate mube:text-label mube:text-foreground", children: [nome, p.id === sessao.utilizador?.id && _jsx("span", { className: "mube:text-muted-foreground", children: " \u00B7 voc\u00EA" })] }), _jsxs("span", { className: "mube:truncate mube:text-body-xs mube:text-muted-foreground", children: [!ligado ? "Sem acesso" : ["Suporte", ...(comADrive ? ["Drive"] : []), ...(comCredenciais ? ["credenciais"] : [])].join(", ").replace(/, ([^,]*)$/, " e $1"), p.email && p.nome ? ` · ${p.email}` : ""] })] }), _jsx("span", { className: "mube:flex mube:w-14 mube:justify-center", children: _jsx(Interruptor, { ligado: ligado, aoMudar: () => alternar(p.id), rotulo: `Acesso ao suporte: ${nome}` }) }), _jsx("span", { className: "mube:flex mube:w-14 mube:justify-center", children: _jsx(Interruptor, { ligado: comADrive, aoMudar: () => alternarExtra(p.id, "drive"), rotulo: `Acesso à Drive: ${nome}`, desligado: !ligado }) }), _jsx("span", { className: "mube:flex mube:w-[4.5rem] mube:justify-center", children: _jsx(Interruptor, { ligado: comCredenciais, aoMudar: () => alternarExtra(p.id, "credenciais"), rotulo: `Acesso às credenciais: ${nome}`, desligado: !ligado }) })] }, p.id));
                                        }), visiveis.length === 0 && _jsxs("li", { className: "mube:px-3 mube:py-4 mube:text-center mube:text-body-sm mube:text-muted-foreground", children: ["Ningu\u00E9m com \u201C", busca.trim(), "\u201D."] })] }), _jsxs("p", { className: "mube:flex mube:items-start mube:gap-2 mube:text-body-xs mube:text-muted-foreground", children: [_jsx(Icone, { nome: "Bell", tamanho: 14, className: "mube:mt-px" }), "Quem fica sem acesso deixa de ver o suporte e de receber avisos; os pedidos que j\u00E1 fez continuam com a equipa. Sem a Drive, a pessoa usa o suporte mas n\u00E3o v\u00EA os ficheiros do projeto. As credenciais d\u00EA s\u00F3 a quem gere os acessos da empresa."] })] }))] }) }), (mudou || aviso) && dados && (_jsxs("div", { className: "mube:flex mube:shrink-0 mube:items-center mube:justify-end mube:gap-3 mube:border-t mube:border-border mube:bg-card mube:px-4 mube:py-3 mube:animar-entrar", children: [aviso && (_jsx("p", { role: "status", className: `mube:mr-auto mube:text-body-sm ${aviso.tom === "erro" ? "mube:text-destructive" : "mube:text-status-success"}`, children: aviso.texto })), mudou && (_jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: () => setEscolhidos(new Map(antes)), disabled: aGuardar, children: "Descartar" }), _jsx(Botao, { aCarregar: aGuardar, onClick: guardar, children: "Guardar acessos" })] }))] }))] }));
}
