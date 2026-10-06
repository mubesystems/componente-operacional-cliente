"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useSuporte } from "./componente.js";
import { Botao, haQuanto, Icone, Vazio } from "./ui.js";
const ICONE = {
    estado: "Refresh",
    recebido: "Refresh",
    comentario: "Comment",
    mencao: "At",
    aceite_pendente: "Check circle",
    concluido: "Check circle",
    aviso: "Bell",
    credencial: "Key",
};
const hoje = (iso) => new Date(iso).toDateString() === new Date().toDateString();
/**
 * A central de notificações do componente (Figma: Embed 5.6, S19): mudança de
 * estado, resposta da equipa, aceite pendente. Avisos internos nunca chegam.
 */
export function Notificacoes() {
    const { api, avisos, recarregarAvisos, abrirTicket, abrirSeparador } = useSuporte();
    const [aMarcar, setAMarcar] = useState(false);
    const porLer = avisos.filter((a) => !a.lida).length;
    async function marcarTodas() {
        setAMarcar(true);
        await api.marcarLidas("todas").catch(() => undefined);
        recarregarAvisos();
        setAMarcar(false);
    }
    if (!avisos.length) {
        return _jsx(Vazio, { icone: "Bell", titulo: "Sem notifica\u00E7\u00F5es", texto: "Aqui aparecem as mudan\u00E7as de estado, as respostas da equipa e os pedidos de aceite." });
    }
    const grupos = [
        ["Hoje", avisos.filter((a) => hoje(a.criado_em))],
        ["Anteriores", avisos.filter((a) => !hoje(a.criado_em))],
    ];
    return (_jsx("div", { className: "mube:flex mube:min-h-0 mube:flex-1 mube:flex-col mube:overflow-y-auto", children: _jsxs("div", { className: "mube:mx-auto mube:flex mube:w-full mube:max-w-[456px] mube:flex-col mube:px-4 mube:py-4", children: [_jsxs("div", { className: "mube:flex mube:items-center mube:justify-between mube:pb-2", children: [_jsx("p", { className: "mube:text-body-sm mube:text-muted-foreground", children: porLer ? `${porLer} por ler` : "Tudo lido" }), porLer > 0 && (_jsx(Botao, { estilo: "secundario", tamanho: "sm", aCarregar: aMarcar, onClick: marcarTodas, children: "Marcar todas como lidas" }))] }), grupos
                    .filter(([, lista]) => lista.length)
                    .map(([titulo, lista]) => (_jsxs("section", { className: "mube:flex mube:flex-col", children: [_jsx("h3", { className: "mube:pt-3 mube:pb-1.5 mube:text-label-sm mube:tracking-wide mube:text-muted-foreground mube:uppercase", children: titulo }), _jsx("ul", { className: "mube:flex mube:flex-col", children: lista.map((a) => (_jsx("li", { children: _jsxs("button", { type: "button", disabled: !a.ticket_numero && a.tipo !== "credencial", onClick: () => {
                                        if (!a.lida)
                                            void api.marcarLidas([a.id]).then(recarregarAvisos);
                                        if (a.ticket_numero)
                                            abrirTicket(a.ticket_numero);
                                        else if (a.tipo === "credencial")
                                            abrirSeparador("credenciais");
                                    }, className: `mube:flex mube:w-full mube:items-start mube:gap-3 mube:border-b mube:border-border mube:px-3 mube:py-3 mube:text-left mube:transition-colors mube:duration-150 mube:disabled:cursor-default ${a.lida ? "mube:hover:bg-muted/60" : "mube:bg-muted mube:hover:bg-accent"}`, children: [_jsx("span", { className: `mube:flex mube:size-7 mube:shrink-0 mube:items-center mube:justify-center mube:rounded-full mube:text-muted-foreground ${a.lida ? "mube:bg-muted" : ""}`, children: _jsx(Icone, { nome: ICONE[a.tipo] ?? "Bell" }) }), _jsxs("span", { className: "mube:flex mube:min-w-0 mube:flex-1 mube:flex-col mube:gap-0.5", children: [_jsx("span", { className: "mube:text-label mube:text-foreground", children: a.titulo }), a.corpo && _jsx("span", { className: "mube:text-body-sm mube:text-foreground/85", children: a.corpo }), _jsx("span", { className: "mube:text-body-xs mube:text-muted-foreground", children: haQuanto(a.criado_em) })] }), !a.lida && _jsx("span", { "aria-label": "Por ler", className: "mube:mt-1.5 mube:size-2 mube:shrink-0 mube:rounded-full mube:bg-primary" })] }) }, a.id))) })] }, titulo)))] }) }));
}
