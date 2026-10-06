"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSuporte } from "./componente.js";
import { Anexos } from "./multimedia.js";
import { GravadorDeAudio, ListaDeEnvios, NovoRelato, useEnvios } from "./relato.js";
import { Botao, BotaoIcone, dia, diaEHora, ErroAoCarregar, Esqueleto, ESTADOS_EM_ORDEM, Icone, Janela, Rodinha, rotuloDoEstado, SeloDeEstado, SeloDePrioridade, Vazio, } from "./ui.js";
// ─── Lista e kanban (Figma: Embed 5.1 e 5.3) ─────────────────────────────────
export function Tickets() {
    const { api, versao, ticketAberto, abrirTicket } = useSuporte();
    const [tickets, setTickets] = useState(null);
    const [erro, setErro] = useState(null);
    const [novo, setNovo] = useState(false);
    const carregar = useCallback(() => {
        api
            .tickets()
            .then((r) => {
            setErro(null);
            setTickets(r.tickets);
        })
            .catch((e) => setErro(e.message));
    }, [api]);
    useEffect(() => {
        carregar();
    }, [carregar, versao]);
    const botaoNovo = (_jsx(Botao, { icone: "Plus", onClick: () => setNovo(true), className: "mube:max-md:hidden", children: "Reportar um problema" }));
    return (_jsxs("div", { className: "mube:relative mube:flex mube:min-h-0 mube:flex-1 mube:flex-col", children: [_jsxs("div", { className: "mube:flex mube:items-center mube:justify-between mube:gap-3 mube:px-4 mube:pt-4 mube:pb-2 mube:md:px-6", children: [_jsx("h2", { className: "mube:text-h4 mube:text-primary", children: "Os meus tickets" }), botaoNovo] }), erro ? (_jsx(ErroAoCarregar, { texto: erro, aoTentar: carregar })) : !tickets ? (_jsx(AoCarregar, {})) : tickets.length === 0 ? (_jsx(Vazio, { icone: "Inbox", titulo: "Ainda n\u00E3o h\u00E1 tickets", texto: "Quando algo n\u00E3o funcionar como devia, reporte aqui. Acompanha o estado at\u00E9 a corre\u00E7\u00E3o estar feita.", acao: _jsx(Botao, { icone: "Plus", onClick: () => setNovo(true), children: "Reportar um problema" }) })) : (_jsxs(_Fragment, { children: [_jsx(Kanban, { tickets: tickets, aoAbrir: abrirTicket }), _jsx("ul", { className: "mube:flex-1 mube:overflow-y-auto mube:md:hidden", children: tickets.map((t) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => abrirTicket(t.numero), className: "mube:flex mube:w-full mube:flex-col mube:gap-1 mube:border-b mube:border-border mube:px-4 mube:py-3 mube:text-left mube:active:bg-muted", children: [_jsxs("span", { className: "mube:flex mube:items-center mube:gap-2", children: [_jsx("span", { className: "mube:flex-1 mube:font-mono mube:text-mono-sm mube:text-muted-foreground", children: t.codigo }), _jsx(SeloDeEstado, { estado: t.estado })] }), _jsx("span", { className: "mube:text-label mube:text-foreground", children: t.titulo ?? t.codigo }), _jsxs("span", { className: "mube:flex mube:items-center mube:gap-1.5", children: [t.nao_lido && _jsx("span", { "aria-label": "Novidades", className: "mube:size-1.5 mube:shrink-0 mube:rounded-full mube:bg-primary" }), _jsx(MetaDoTicket, { t: t, data: t.criado_em ? dia(t.criado_em) : "" })] })] }) }, t.numero))) })] })), _jsx("div", { className: "mube:shrink-0 mube:border-t mube:border-border mube:p-4 mube:md:hidden", children: _jsx(Botao, { tamanho: "lg", onClick: () => setNovo(true), className: "mube:w-full", children: "Reportar um problema" }) }), novo && (_jsx(NovoRelato, { aoFechar: () => setNovo(false), aoCriar: (t) => {
                    setTickets((l) => [t, ...(l ?? []).filter((x) => x.numero !== t.numero)]);
                } })), ticketAberto !== null && _jsx(Detalhe, { numero: ticketAberto, aoMudar: carregar })] }));
}
function AoCarregar() {
    return (_jsx("div", { className: "mube:flex mube:flex-1 mube:gap-2 mube:overflow-hidden mube:px-4 mube:pt-2 mube:pb-4", "aria-busy": "true", "aria-label": "A carregar os tickets", children: [0, 1, 2, 3].map((i) => (_jsxs("div", { className: "mube:flex mube:flex-1 mube:flex-col mube:gap-2 mube:rounded-xl mube:bg-muted mube:p-2", children: [_jsx(Esqueleto, { className: "mube:h-4 mube:w-20" }), _jsx(Esqueleto, { className: "mube:h-20 mube:w-full mube:bg-card" }), i % 2 === 0 && _jsx(Esqueleto, { className: "mube:h-16 mube:w-full mube:bg-card" })] }, i))) }));
}
const iniciais = (nome) => nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i, l) => (i === 0 || i === l.length - 1 ? p[0] : ""))
    .join("")
    .toUpperCase() || "?";
/** Quem relatou, quando, e quantos comentários e anexos tem (o que o cliente vê). */
function MetaDoTicket({ t, data }) {
    const nome = t.relatado_por?.nome ?? null;
    const c = t.contagens ?? { comentarios: 0, anexos: 0 };
    return (_jsxs("span", { className: "mube:flex mube:min-w-0 mube:items-center mube:gap-1.5 mube:text-body-xs mube:text-muted-foreground", children: [nome && (_jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": true, className: "mube:flex mube:size-[18px] mube:shrink-0 mube:items-center mube:justify-center mube:overflow-hidden mube:rounded-full mube:bg-muted mube:text-[9px] mube:font-semibold mube:text-muted-foreground", children: t.relatado_por?.foto_url ? _jsx("img", { src: t.relatado_por.foto_url, alt: "", className: "mube:size-full mube:object-cover" }) : iniciais(nome) }), _jsx("span", { className: "mube:min-w-0 mube:truncate mube:text-foreground", children: nome }), _jsx("span", { "aria-hidden": true, children: "\u00B7" })] })), _jsx("span", { className: "mube:shrink-0", children: data }), _jsx("span", { className: "mube:flex-1" }), c.comentarios > 0 && (_jsxs("span", { className: "mube:flex mube:shrink-0 mube:items-center mube:gap-1", "aria-label": `${c.comentarios} ${c.comentarios === 1 ? "comentário" : "comentários"}`, children: [_jsx(Icone, { nome: "Comment", tamanho: 14 }), c.comentarios] })), c.anexos > 0 && (_jsxs("span", { className: "mube:flex mube:shrink-0 mube:items-center mube:gap-1", "aria-label": `${c.anexos} ${c.anexos === 1 ? "anexo" : "anexos"}`, children: [_jsx(Icone, { nome: "Attachment", tamanho: 14 }), c.anexos] }))] }));
}
function Kanban({ tickets, aoAbrir }) {
    return (_jsx("div", { className: "mube:hidden mube:min-h-0 mube:flex-1 mube:gap-2 mube:overflow-x-auto mube:px-4 mube:pt-2 mube:pb-4 mube:md:flex", children: ESTADOS_EM_ORDEM.map((estado) => {
            const daColuna = tickets.filter((t) => t.estado === estado);
            return (_jsxs("section", { "aria-label": rotuloDoEstado(estado), className: "mube:flex mube:min-w-[296px] mube:flex-1 mube:shrink-0 mube:flex-col mube:gap-2 mube:overflow-y-auto mube:rounded-xl mube:bg-muted mube:p-2", children: [_jsxs("header", { className: "mube:flex mube:items-center mube:gap-1.5 mube:px-0.5 mube:pt-0.5 mube:pb-1", children: [_jsx(SeloDeEstado, { estado: estado }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: daColuna.length })] }), daColuna.map((t) => (_jsxs("button", { type: "button", onClick: () => aoAbrir(t.numero), className: "mube:flex mube:w-full mube:flex-col mube:gap-1.5 mube:rounded-[10px] mube:border mube:border-border mube:bg-card mube:p-2.5 mube:text-left mube:shadow-soft-2 mube:transition-shadow mube:duration-200 mube:animar-entrar mube:hover:shadow-soft-3 mube:focus-visible:shadow-focus", children: [_jsxs("span", { className: "mube:flex mube:items-center mube:gap-1.5", children: [_jsx("span", { className: "mube:flex-1 mube:font-mono mube:text-mono-sm mube:text-muted-foreground", children: t.codigo }), t.nao_lido && _jsx("span", { "aria-label": "Novidades", className: "mube:size-2 mube:rounded-full mube:bg-primary" })] }), _jsx("span", { className: "mube:text-label mube:text-primary", children: t.titulo ?? t.codigo }), _jsx(MetaDoTicket, { t: t, data: t.criado_em ? dia(t.criado_em) : "" })] }, t.numero)))] }, estado));
        }) }));
}
// ─── Detalhe (Figma: Embed 5.3 e 5.4) ────────────────────────────────────────
const IMPACTO = {
    impede: ["Impede", "não consigo trabalhar"],
    contorno: ["Contorno", "há outro caminho"],
    incomoda: ["Incomoda", "não atrapalha o trabalho"],
    cosmetico: ["Cosmético", "só aparência"],
};
function Detalhe({ numero, aoMudar }) {
    const { api, fecharTicket, avisos, recarregarAvisos, versao } = useSuporte();
    const [ticket, setTicket] = useState(null);
    const [defasado, setDefasado] = useState(false);
    const [erro, setErro] = useState(null);
    const [janela, setJanela] = useState(null);
    // O rail do painel: o ticket ou a conversa com a equipa.
    const [aba, setAba] = useState("ticket");
    const [aviso, setAviso] = useState(null);
    const carregar = useCallback(() => {
        api
            .ticket(numero)
            .then((r) => {
            setErro(null);
            setTicket(r.ticket);
            setDefasado(r.defasado);
        })
            .catch((e) => setErro(e.message));
    }, [api, numero]);
    useEffect(() => {
        carregar();
    }, [carregar, versao]);
    // Abrir o ticket lê os avisos dele.
    const porLer = avisos.filter((a) => !a.lida && a.ticket_numero === numero).map((a) => a.id);
    const chavePorLer = porLer.join(",");
    useEffect(() => {
        if (!chavePorLer)
            return;
        api.marcarLidas(chavePorLer.split(",")).then(recarregarAvisos).catch(() => undefined);
    }, [api, chavePorLer, recarregarAvisos]);
    useEffect(() => {
        const tecla = (e) => e.key === "Escape" && !janela && fecharTicket();
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [fecharTicket, janela]);
    const [pendente, setPendente] = useState(null);
    function comentar(corpo, ficheiros) {
        setPendente({ corpo, ficheiros, estado: "a_enviar" });
        api
            .comentar(numero, corpo, null, ficheiros)
            .then(() => {
            setPendente(null);
            carregar();
        })
            .catch(() => setPendente({ corpo, ficheiros, estado: "falhou" }));
    }
    const depois = (texto) => {
        setJanela(null);
        setAviso(texto);
        carregar();
        aoMudar();
    };
    return (_jsxs("div", { className: "mube:fixed mube:inset-0 mube:z-[2147483001] mube:flex mube:justify-end mube:bg-black/30 mube:md:p-2", onMouseDown: (e) => e.target === e.currentTarget && fecharTicket(), children: [_jsxs("aside", { "aria-label": ticket?.codigo ?? "Ticket", className: "mube:flex mube:h-full mube:w-full mube:overflow-hidden mube:bg-card mube:shadow-soft-6 mube:animar-de-lado mube:md:w-[480px] mube:md:rounded-[20px]", children: [_jsx("nav", { "aria-label": "Sec\u00E7\u00F5es do ticket", className: "mube:flex mube:w-16 mube:shrink-0 mube:flex-col mube:items-center mube:gap-2 mube:border-r mube:border-border mube:bg-background mube:px-3 mube:pt-3 mube:pb-2", children: [
                            { valor: "ticket", rotulo: "Ticket", icone: "File text" },
                            { valor: "conversa", rotulo: "Conversa com a equipa", icone: "Comment" },
                        ].map((r) => {
                            const ativo = aba === r.valor;
                            const n = r.valor === "conversa" ? (ticket?.comentarios.filter((c) => !c.apagado).length ?? 0) : 0;
                            return (_jsxs("button", { type: "button", "aria-label": r.rotulo, title: r.rotulo, "aria-current": ativo ? "page" : undefined, onClick: () => setAba(r.valor), className: `mube:relative mube:flex mube:size-10 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-xl mube:transition-colors mube:duration-150 mube:focus-visible:shadow-focus ${ativo ? "mube:bg-card mube:text-foreground mube:shadow-soft-2" : "mube:text-muted-foreground mube:hover:bg-muted mube:hover:text-foreground"}`, children: [_jsx(Icone, { nome: r.icone }), n > 0 && (_jsx("span", { className: "mube:absolute mube:-top-1 mube:-right-1 mube:flex mube:h-4 mube:min-w-4 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary mube:px-1 mube:text-[10px] mube:leading-none mube:text-primary-foreground", children: n }))] }, r.valor));
                        }) }), _jsxs("div", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col", children: [_jsxs("header", { className: "mube:flex mube:h-14 mube:shrink-0 mube:items-center mube:gap-2 mube:border-b mube:border-border mube:pr-3 mube:pl-4", children: [_jsxs("h2", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:items-baseline mube:gap-2", children: [_jsx("span", { className: "mube:text-h4 mube:text-foreground", children: ticket?.codigo ?? `COR-${String(numero).padStart(3, "0")}` }), _jsx("span", { className: "mube:truncate mube:text-body-sm mube:text-muted-foreground", children: aba === "conversa" ? "Conversa com a equipa" : "" })] }), _jsx(BotaoIcone, { icone: "X", rotulo: "Fechar o ticket", onClick: fecharTicket })] }), erro ? (_jsx(ErroAoCarregar, { texto: erro, aoTentar: carregar })) : !ticket ? (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-3 mube:p-4", "aria-busy": "true", children: [_jsx(Esqueleto, { className: "mube:h-6 mube:w-3/4" }), _jsx(Esqueleto, { className: "mube:h-4 mube:w-1/2" }), _jsx(Esqueleto, { className: "mube:h-32 mube:w-full" }), _jsx(Esqueleto, { className: "mube:h-20 mube:w-full" })] })) : (aba === "conversa" ? (
                            // A conversa vive no seu separador, com a caixa de comentário no fundo.
                            _jsxs("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col mube:animar-entrar", children: [_jsx("div", { className: "mube:min-h-0 mube:flex-1 mube:overflow-y-auto", children: _jsx(Conversa, { ticket: ticket, pendente: pendente, aoTentarDeNovo: () => pendente && comentar(pendente.corpo, pendente.ficheiros), noRail: true }) }), _jsx(Compositor, { ocupado: pendente?.estado === "a_enviar", aoEnviar: comentar })] })) : (_jsxs("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col mube:gap-4 mube:overflow-y-auto mube:p-4 mube:animar-entrar", children: [defasado && (_jsxs("p", { role: "status", className: "mube:flex mube:items-start mube:gap-2 mube:rounded-xl mube:bg-state-aguardando-aceite-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-aguardando-aceite-fg", children: [_jsx(Icone, { nome: "Clock", className: "mube:mt-0.5" }), "Pode n\u00E3o estar atualizado: o suporte n\u00E3o respondeu agora. Mostramos a \u00FAltima informa\u00E7\u00E3o recebida."] })), aviso && (_jsx("p", { role: "status", className: "mube:rounded-xl mube:bg-state-concluida-bg mube:px-3 mube:py-2.5 mube:text-body-sm mube:text-state-concluida-fg mube:animar-entrar", children: aviso })), ticket.estado === "aguardando_aceite" && (_jsxs("section", { className: "mube:flex mube:flex-col mube:gap-2 mube:rounded-2xl mube:border mube:border-state-aguardando-aceite-fg/20 mube:bg-state-aguardando-aceite-bg mube:p-3.5", children: [_jsx("p", { className: "mube:text-label-strong mube:text-foreground", children: "A sua valida\u00E7\u00E3o \u00E9 necess\u00E1ria" }), _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: "A corre\u00E7\u00E3o est\u00E1 pronta. Aceite ou recuse com o motivo." }), ticket.aceite_tacito && (_jsxs("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: ["Sem resposta, a corre\u00E7\u00E3o \u00E9 dada como aceite depois de 3 avisos (", ticket.aceite_tacito.envios_com_sucesso, " de 3 enviados)."] })), _jsxs("span", { className: "mube:flex mube:gap-2 mube:pt-1", children: [_jsx(Botao, { onClick: () => setJanela("aceite"), children: "Aceitar corre\u00E7\u00E3o" }), _jsx(Botao, { estilo: "secundario", onClick: () => setJanela("recusa"), children: "Recusar" })] })] })), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-2", children: [_jsx("h3", { className: "mube:text-h4 mube:text-foreground", children: ticket.titulo }), _jsxs("p", { className: "mube:flex mube:flex-wrap mube:items-center mube:gap-2 mube:text-body-xs mube:text-muted-foreground", children: [_jsx(SeloDeEstado, { estado: ticket.estado }), "Enviado ", ticket.relatos[0]?.utilizador?.nome ? `por ${ticket.relatos[0].utilizador.nome}` : "", " \u00B7 ", diaEHora(ticket.criado_em)] })] }), ticket.estado === "descartada" ? (_jsxs("section", { className: "mube:flex mube:flex-col mube:gap-1 mube:rounded-2xl mube:border mube:border-border mube:bg-state-descartada-bg mube:p-3.5", children: [_jsxs("p", { className: "mube:text-label-strong mube:text-foreground", children: ["Ticket encerrado", ticket.descarte?.rotulo ? `: ${ticket.descarte.rotulo}` : ""] }), ticket.descarte?.motivo && _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: ticket.descarte.motivo })] })) : (_jsx(LinhaDoTempo, { ticket: ticket })), ticket.reaberturas > 0 && (_jsxs("p", { className: "mube:flex mube:items-center mube:gap-1.5 mube:text-body-xs mube:text-muted-foreground", children: [_jsx(Icone, { nome: "Refresh", tamanho: 14 }), "Reaberto ", ticket.reaberturas === 1 ? "1 vez" : `${ticket.reaberturas} vezes`, " depois de uma recusa."] })), ticket.aceite?.tipo === "tacito" && (_jsxs("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: ["Aceite automaticamente: 3 avisos chegaram sem resposta (", dia(ticket.aceite.em), ")."] })), _jsxs("section", { className: "mube:flex mube:flex-col mube:gap-3 mube:rounded-2xl mube:border mube:border-border mube:p-3.5", children: [_jsx("p", { className: "mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "O que enviou" }), ticket.relatos.map((r) => (_jsxs("div", { className: "mube:flex mube:flex-col mube:gap-3", children: [r.texto && _jsx("p", { className: "mube:text-body mube:whitespace-pre-wrap mube:text-foreground", children: r.texto }), _jsx(Anexos, { anexos: r.anexos }), _jsxs("div", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [_jsx("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: "Isto impede o seu trabalho?" }), _jsxs("p", { className: "mube:flex mube:items-center mube:gap-2 mube:rounded-lg mube:border mube:border-border mube:px-3 mube:py-2 mube:text-label mube:text-foreground", children: [_jsx("span", { "aria-hidden": true, className: "mube:size-1.5 mube:rounded-full mube:bg-foreground" }), IMPACTO[r.impacto]?.[0], _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: IMPACTO[r.impacto]?.[1] })] })] })] }, r.id)))] }), _jsxs("section", { className: "mube:flex mube:flex-col mube:gap-2 mube:rounded-2xl mube:bg-muted mube:p-3.5", children: [_jsx("p", { className: "mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Definido pela equipa" }), _jsxs("div", { className: "mube:flex mube:gap-8", children: [_jsxs("span", { className: "mube:flex mube:flex-col mube:gap-1", children: [_jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: "Prioridade" }), ticket.prioridade ? _jsx(SeloDePrioridade, { valor: ticket.prioridade.valor, rotulo: ticket.prioridade.rotulo }) : _jsx("span", { className: "mube:text-body-sm mube:text-muted-foreground", children: "Na triagem" })] }), _jsxs("span", { className: "mube:flex mube:flex-col mube:gap-1", children: [_jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: "Prazo" }), _jsx("span", { className: "mube:font-mono mube:text-mono-sm mube:text-foreground", children: ticket.prazo ? dia(ticket.prazo) : "—" })] })] }), _jsx("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: "Estado, prioridade e prazo s\u00E3o definidos pela equipa." })] }), _jsxs("button", { type: "button", onClick: () => setAba("conversa"), className: "mube:flex mube:items-center mube:gap-2 mube:rounded-xl mube:border mube:border-border mube:px-3 mube:py-2.5 mube:text-left mube:text-label mube:text-foreground mube:transition-colors mube:hover:bg-muted", children: [_jsx(Icone, { nome: "Comment", className: "mube:text-muted-foreground" }), _jsx("span", { className: "mube:flex-1", children: "Conversa com a equipa" }), _jsx("span", { className: "mube:text-body-sm mube:text-muted-foreground", children: ticket.comentarios.filter((c) => !c.apagado).length }), _jsx(Icone, { nome: "Chevron right", className: "mube:text-muted-foreground" })] })] })))] })] }), ticket && janela === "aceite" && _jsx(JanelaAceite, { numero: ticket.numero, aoFechar: () => setJanela(null), aoFeito: () => depois("Aceite enviado. O ticket fica concluído.") }), ticket && janela === "recusa" && _jsx(JanelaRecusa, { numero: ticket.numero, aoFechar: () => setJanela(null), aoFeito: () => depois("Recusa enviada. O ticket voltou a Relato e a equipa foi avisada.") })] }));
}
/** Os estados por onde passou, com a data, e os que faltam (Figma: Timeline). */
function LinhaDoTempo({ ticket }) {
    const passos = [];
    for (const p of ticket.linha_do_tempo ?? [])
        if (passos.at(-1)?.estado !== p.estado)
            passos.push(p);
    if (!passos.length)
        passos.push({ estado: ticket.estado, em: ticket.criado_em });
    const atual = ESTADOS_EM_ORDEM.indexOf(ticket.estado);
    const faltam = ticket.estado === "concluida" ? [] : ESTADOS_EM_ORDEM.slice(atual + 1, ESTADOS_EM_ORDEM.indexOf("concluida") + 1).slice(0, 2);
    const vistos = passos.slice(-5);
    return (_jsxs("ol", { "aria-label": "Linha do tempo", className: "mube:flex mube:items-start", children: [vistos.map((p, i) => {
                const ultimo = i === vistos.length - 1;
                return (_jsxs("li", { className: "mube:flex mube:flex-1 mube:flex-col mube:items-center mube:gap-1", children: [_jsxs("span", { className: "mube:flex mube:w-full mube:items-center", children: [_jsx("span", { className: `mube:h-px mube:flex-1 ${i === 0 ? "mube:bg-transparent" : "mube:bg-border"}` }), ultimo ? (_jsx("span", { className: "mube:flex mube:size-3.5 mube:items-center mube:justify-center mube:rounded-full mube:bg-foreground", children: _jsx("span", { className: "mube:size-1.5 mube:rounded-full mube:bg-card" }) })) : (_jsx("span", { className: "mube:flex mube:size-3.5 mube:items-center mube:justify-center mube:rounded-full mube:bg-muted mube:text-muted-foreground", children: _jsx(Icone, { nome: "Tick", tamanho: 10 }) })), _jsx("span", { className: `mube:h-px mube:flex-1 ${ultimo && !faltam.length ? "mube:bg-transparent" : "mube:bg-border"}` })] }), ultimo && _jsx("span", { className: "mube:text-center mube:text-label-sm mube:text-foreground", children: rotuloDoEstado(p.estado) }), _jsx("span", { className: "mube:text-center mube:text-body-xs mube:text-muted-foreground", children: dia(p.em) })] }, `${p.estado}-${p.em}`));
            }), faltam.map((e, i) => (_jsx("li", { className: "mube:flex mube:flex-1 mube:flex-col mube:items-center", children: _jsxs("span", { className: "mube:flex mube:w-full mube:items-center", title: rotuloDoEstado(e), children: [_jsx("span", { className: "mube:h-px mube:flex-1 mube:bg-border" }), _jsx("span", { className: "mube:size-3.5 mube:rounded-full mube:border mube:border-input" }), _jsx("span", { className: `mube:h-px mube:flex-1 ${i === faltam.length - 1 ? "mube:bg-transparent" : "mube:bg-border"}` })] }) }, e)))] }));
}
/** Conversa com a equipa (B5, B6): só o externo. A equipa aparece como "Equipa de suporte" (K2). */
/** O texto do comentário com as menções destacadas; a menção a quem está a ler, mais forte. */
function CorpoComMencoes({ texto, mencoes, euId }) {
    const nomes = mencoes.filter((m) => m.nome && texto.includes(`@${m.nome}`)).sort((a, b) => b.nome.length - a.nome.length);
    if (!nomes.length)
        return _jsx(_Fragment, { children: texto });
    const escapar = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const porNome = new Map(nomes.map((m) => [`@${m.nome}`, m]));
    const partes = texto.split(new RegExp(`(@(?:${nomes.map((m) => escapar(m.nome)).join("|")}))`, "g"));
    return (_jsx(_Fragment, { children: partes.map((parte, i) => {
            const m = porNome.get(parte);
            if (!m)
                return parte;
            const eu = m.id === euId;
            return (_jsx("span", { className: `mube:rounded mube:px-0.5 mube:font-semibold ${eu ? "mube:bg-status-info/15 mube:text-status-info" : "mube:text-status-info"}`, children: parte }, i));
        }) }));
}
function Conversa({ ticket, pendente, aoTentarDeNovo, noRail }) {
    const { sessao } = useSuporte();
    const fim = useRef(null);
    const antes = useRef(ticket.comentarios.length);
    // No rail, a conversa abre no fim, como um chat.
    useEffect(() => {
        if (noRail)
            fim.current?.scrollIntoView({ block: "end" });
    }, [noRail]);
    // Só desce quando entra uma mensagem nova; ao abrir, o topo (e a validação) fica à vista.
    useEffect(() => {
        if (ticket.comentarios.length === antes.current && !pendente)
            return;
        antes.current = ticket.comentarios.length;
        fim.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [ticket.comentarios.length, pendente]);
    return (_jsxs("section", { className: `mube:flex mube:flex-col mube:gap-3 ${noRail ? "mube:p-4" : "mube:border-t mube:border-border mube:pt-4"}`, children: [!noRail && _jsx("p", { className: "mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: "Conversa com a equipa" }), !ticket.comentarios.length && !pendente && _jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: "Nenhum coment\u00E1rio ainda. Escreva abaixo para falar com a equipa." }), _jsxs("ul", { className: "mube:flex mube:flex-col mube:gap-3", children: [ticket.comentarios.map((c) => {
                        const meu = c.autor.tipo === "cliente" && c.autor.id === sessao.utilizador?.id;
                        const doCliente = c.autor.tipo === "cliente";
                        return (_jsxs("li", { className: `mube:flex mube:flex-col mube:gap-1 ${doCliente ? "mube:items-end" : "mube:items-start"}`, children: [_jsxs("div", { className: `mube:flex mube:max-w-[85%] mube:flex-col mube:gap-0.5 mube:rounded-2xl mube:px-3 mube:py-2 ${doCliente ? "mube:bg-primary mube:text-primary-foreground" : "mube:bg-muted mube:text-foreground"}`, children: [_jsx("span", { className: `mube:text-body-xs ${doCliente ? "mube:text-primary-foreground/70" : "mube:text-muted-foreground"}`, children: doCliente ? (meu ? "Você" : (c.autor.nome ?? "Cliente")) : "Equipa de suporte" }), c.apagado ? _jsx("span", { className: "mube:text-body-sm mube:italic mube:opacity-70", children: "Mensagem apagada" }) : _jsx("span", { className: "mube:text-body-sm mube:whitespace-pre-wrap", children: _jsx(CorpoComMencoes, { texto: c.corpo ?? "", mencoes: c.mencoes ?? [], euId: sessao.utilizador?.id }) }), !c.apagado && c.anexos.length > 0 && (_jsx("div", { className: doCliente ? "mube:rounded-lg mube:bg-card mube:p-1 mube:text-foreground" : "", children: _jsx(Anexos, { anexos: c.anexos, compacto: true }) }))] }), _jsxs("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: [diaEHora(c.criado_em), c.editado && " · editado"] })] }, c.id));
                    }), pendente?.estado === "a_enviar" && (_jsxs("li", { className: "mube:flex mube:flex-col mube:items-end mube:gap-1 mube:opacity-60", children: [_jsx("div", { className: "mube:max-w-[85%] mube:rounded-2xl mube:bg-primary mube:px-3 mube:py-2 mube:text-body-sm mube:whitespace-pre-wrap mube:text-primary-foreground", children: pendente.corpo }), _jsxs("span", { className: "mube:flex mube:items-center mube:gap-1 mube:text-body-xs mube:text-muted-foreground", children: [_jsx(Rodinha, {}), " A enviar\u2026"] })] })), pendente?.estado === "falhou" && (_jsxs("li", { className: "mube:flex mube:flex-col mube:items-end mube:gap-1", children: [_jsx("div", { className: "mube:max-w-[85%] mube:rounded-2xl mube:border mube:border-destructive mube:px-3 mube:py-2 mube:text-body-sm mube:whitespace-pre-wrap mube:text-foreground", children: pendente.corpo }), _jsxs("span", { className: "mube:flex mube:items-center mube:gap-2 mube:text-body-xs mube:text-status-error", children: ["N\u00E3o foi enviado.", _jsx("button", { type: "button", onClick: aoTentarDeNovo, className: "mube:font-semibold mube:underline", children: "Tentar de novo" })] })] }))] }), _jsx("div", { ref: fim })] }));
}
/** A caixa de resposta, fixa no fundo do detalhe, com anexos (clipe ou arrastar). */
function Compositor({ ocupado, aoEnviar }) {
    const { api } = useSuporte();
    const [texto, setTexto] = useState("");
    const [sobre, setSobre] = useState(false);
    const envios = useEnvios(api);
    const entrada = useRef(null);
    const pronto = (texto.trim() || envios.ids.length > 0) && !envios.aEnviar && !ocupado;
    function enviar() {
        if (!pronto)
            return;
        // Só com ficheiros, o comentário leva os nomes deles.
        const corpo = texto.trim() || envios.envios.filter((e) => e.estado === "enviado").map((e) => e.nome).join(", ");
        aoEnviar(corpo, envios.ids);
        setTexto("");
        envios.limpar();
    }
    return (_jsxs("div", { className: `mube:flex mube:shrink-0 mube:flex-col mube:gap-2 mube:border-t mube:border-border mube:bg-card mube:px-4 mube:pt-3 mube:pb-3 mube:transition-colors ${sobre ? "mube:bg-accent" : ""}`, onDragOver: (e) => {
            if (!e.dataTransfer.types.includes("Files"))
                return;
            e.preventDefault();
            setSobre(true);
        }, onDragLeave: () => setSobre(false), onDrop: (e) => {
            e.preventDefault();
            setSobre(false);
            if (e.dataTransfer.files.length)
                envios.juntar([...e.dataTransfer.files]);
        }, children: [envios.envios.length > 0 && (_jsx("div", { className: "mube:max-h-40 mube:overflow-y-auto", children: _jsx(ListaDeEnvios, { envios: envios.envios, aoRetirar: envios.retirar }) })), _jsxs("form", { onSubmit: (e) => {
                    e.preventDefault();
                    enviar();
                }, className: "mube:flex mube:items-end mube:gap-2", children: [_jsxs("span", { className: "mube:flex mube:min-h-10 mube:flex-1 mube:items-end mube:rounded-[20px] mube:border mube:border-input mube:bg-card mube:pl-1 mube:transition-[border-color,box-shadow] mube:focus-within:border-foreground mube:focus-within:shadow-input-focus", children: [_jsx("button", { type: "button", "aria-label": "Anexar ficheiros", title: "Anexar ficheiros", onClick: () => entrada.current?.click(), className: "mube:mb-1 mube:flex mube:size-8 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:text-muted-foreground mube:transition-colors mube:hover:bg-muted mube:hover:text-foreground", children: _jsx(Icone, { nome: "Attachment" }) }), _jsx("textarea", { value: texto, onChange: (e) => setTexto(e.target.value), onKeyDown: (e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        enviar();
                                    }
                                }, rows: 1, "aria-label": "Resposta para a equipa", placeholder: sobre ? "Solte para anexar" : "Escreva à equipa", className: "mube:max-h-32 mube:min-h-10 mube:flex-1 mube:resize-none mube:py-2 mube:pr-4 mube:pl-1 mube:text-body-sm mube:text-foreground mube:placeholder:text-muted-foreground mube:focus:outline-none" })] }), _jsx("input", { ref: entrada, type: "file", multiple: true, hidden: true, onChange: (e) => {
                            if (e.target.files?.length)
                                envios.juntar([...e.target.files]);
                            e.target.value = "";
                        } }), _jsx("button", { type: "submit", "aria-label": "Enviar", disabled: !pronto, className: "mube:flex mube:size-10 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:bg-primary mube:text-primary-foreground mube:transition-colors mube:hover:bg-primary-hover mube:disabled:bg-muted mube:disabled:text-muted-foreground", children: envios.aEnviar ? _jsx(Rodinha, {}) : _jsx(Icone, { nome: "Send" }) })] }), _jsx("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: "A sua resposta \u00E9 vis\u00EDvel para a equipa." })] }));
}
// ─── Aceite e recusa (Figma: Embed 5.4; S30: são pedidos à plataforma) ───────
function JanelaAceite({ numero, aoFechar, aoFeito }) {
    const { api } = useSuporte();
    const [aEnviar, setAEnviar] = useState(false);
    const [erro, setErro] = useState(null);
    async function confirmar() {
        setAEnviar(true);
        setErro(null);
        try {
            await api.aceitar(numero);
            aoFeito();
        }
        catch (e) {
            setErro(e.message);
            setAEnviar(false);
        }
    }
    return (_jsx(Janela, { titulo: "Aceitar a corre\u00E7\u00E3o?", descricao: "O seu aceite \u00E9 enviado \u00E0 plataforma. O ticket passa a Conclu\u00EDda quando ela confirmar.", aoFechar: aoFechar, largura: "mube:md:w-[420px]", rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Voltar" }), _jsx(Botao, { "data-principal": true, aCarregar: aEnviar, onClick: confirmar, className: "mube:md:flex-1", children: "Confirmar aceite" })] }), children: erro && _jsx("p", { className: "mube:text-body-sm mube:text-destructive", children: erro }) }));
}
function JanelaRecusa({ numero, aoFechar, aoFeito }) {
    const { api } = useSuporte();
    const [motivo, setMotivo] = useState("");
    const [validar, setValidar] = useState(false);
    const [aEnviar, setAEnviar] = useState(false);
    const [erro, setErro] = useState(null);
    const [audio, setAudio] = useState(null);
    const envios = useEnvios(api);
    const entrada = useRef(null);
    async function enviar() {
        setValidar(true);
        if (!motivo.trim() || envios.aEnviar)
            return;
        setAEnviar(true);
        setErro(null);
        try {
            await api.recusar(numero, motivo.trim(), envios.ids);
            aoFeito();
        }
        catch (e) {
            setErro(e.message);
            setAEnviar(false);
        }
    }
    return (_jsxs(Janela, { titulo: "Recusar a corre\u00E7\u00E3o", aoFechar: aoFechar, largura: "mube:md:w-[480px]", rodape: _jsxs(_Fragment, { children: [_jsx(Botao, { estilo: "secundario", onClick: aoFechar, children: "Voltar" }), _jsx(Botao, { "data-principal": true, aCarregar: aEnviar, disabled: envios.aEnviar, onClick: enviar, className: "mube:md:flex-1", children: envios.aEnviar ? "A enviar ficheiros…" : "Enviar recusa" })] }), children: [_jsxs("label", { className: "mube:flex mube:flex-col mube:gap-1.5", children: [_jsx("span", { className: "mube:text-label mube:text-foreground", children: "Porque \u00E9 que a corre\u00E7\u00E3o n\u00E3o resolveu?" }), _jsx("textarea", { value: motivo, onChange: (e) => setMotivo(e.target.value), rows: 4, maxLength: 10000, placeholder: "Descreva o que ainda acontece", className: `mube:w-full mube:resize-none mube:rounded-xl mube:border mube:bg-card mube:px-3 mube:py-2.5 mube:text-body mube:text-foreground mube:placeholder:text-muted-foreground mube:focus:border-foreground mube:focus:shadow-input-focus mube:focus:outline-none ${validar && !motivo.trim() ? "mube:border-destructive" : "mube:border-input"}` }), validar && !motivo.trim() && _jsx("span", { className: "mube:text-body-xs mube:text-destructive", children: "O motivo \u00E9 obrigat\u00F3rio." })] }), _jsxs("span", { className: "mube:flex mube:flex-wrap mube:items-center mube:gap-2", children: [_jsx(GravadorDeAudio, { gravado: audio, aoRetirar: () => {
                            if (audio)
                                envios.retirar(audio.chave);
                            setAudio(null);
                        }, aoGravar: (blob, segundos) => {
                            if (audio)
                                envios.retirar(audio.chave);
                            const [c] = envios.juntar([{ blob, nome: `audio-recusa-${Date.now()}.webm`, audio: true }]);
                            setAudio({ chave: c, segundos });
                        } }), _jsxs("button", { type: "button", onClick: () => entrada.current?.click(), className: "mube:inline-flex mube:h-8 mube:items-center mube:gap-1.5 mube:rounded-full mube:border mube:border-border mube:bg-card mube:px-3 mube:text-label-sm mube:text-foreground mube:hover:bg-muted", children: [_jsx(Icone, { nome: "Video", tamanho: 14 }), "V\u00EDdeo ou imagem"] }), _jsx("input", { ref: entrada, type: "file", accept: "image/*,video/*", multiple: true, hidden: true, onChange: (e) => {
                            if (e.target.files?.length)
                                envios.juntar([...e.target.files]);
                            e.target.value = "";
                        } })] }), _jsx(ListaDeEnvios, { envios: envios.envios.filter((e) => !e.audio), aoRetirar: envios.retirar }), _jsx("p", { className: "mube:text-body-xs mube:text-muted-foreground", children: "O ticket volta a Relato e a equipa \u00E9 avisada." }), erro && _jsx("p", { className: "mube:text-body-sm mube:text-destructive", children: erro })] }));
}
