import { type Api } from "./api.js";
import type { NotificacaoLida, Sessao } from "../tipos.js";
interface Contexto {
    api: Api;
    sessao: Sessao;
    avisos: NotificacaoLida[];
    recarregarAvisos: () => void;
    /** Depois de mudar os acessos: o próprio gestor pode ter ganho ou perdido o acesso. */
    recarregarSessao: () => void;
    /** Muda quando há novidades: as listas abertas recarregam. */
    versao: number;
    abrirTicket: (numero: number) => void;
    ticketAberto: number | null;
    fecharTicket: () => void;
}
export declare const useSuporte: () => Contexto;
/**
 * O componente da Mube no software do cliente (Figma: Embed 5.1 a 5.6).
 * Um botão "Suporte" no canto; abre o painel com Tickets, Drive e
 * Notificações. Identidade neutra (K2): só tokens neutros, sem marca.
 *
 * Fala só com a parte servidor do próprio software (`base`), nunca com a
 * plataforma: a chave do projeto não vem ao navegador.
 */
export declare function ComponenteMube({ base, rotulo, tema, posicao, }: {
    /** Onde está montada a parte servidor (o Route Handler `[...caminho]`). */
    base?: string;
    /** O texto do botão e do cabeçalho. */
    rotulo?: string;
    /** "auto" segue a página (a classe `dark` do <html>). */
    tema?: "claro" | "escuro" | "auto";
    posicao?: "direita" | "esquerda";
}): import("react").ReactPortal | null;
export {};
