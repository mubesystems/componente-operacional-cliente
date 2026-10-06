import { type Api } from "./api.js";
import type { NotificacaoLida, Sessao } from "../tipos.js";
export type Separador = "tickets" | "drive" | "credenciais" | "notificacoes" | "acessos";
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
    /** Muda de secção (ex.: um aviso de credencial abre as Credenciais). */
    abrirSeparador: (s: Separador) => void;
    ticketAberto: number | null;
    fecharTicket: () => void;
}
export declare const useSuporte: () => Contexto;
type Tema = "claro" | "escuro" | "auto";
/**
 * O suporte da Mube como uma página do software do cliente (Figma: Embed 5.1
 * a 5.6): Tickets, Drive, Credenciais, Notificações e Acessos. Põe-se numa
 * rota própria (ex.: `app/(painel)/suporte/page.tsx`) e ocupa o espaço que o
 * layout lhe der. O atalho vive no menu do software (`useNovidadesMube`) e o
 * aviso flutuante só aparece com novidades (`AvisoMube`).
 *
 * Aceita `?secao=notificacoes` (ou tickets, drive, credenciais, acessos) e
 * `?ticket=12` no endereço, para os atalhos levarem ao sítio certo.
 */
export declare function PaginaMube({ base, rotulo, tema, moldura, className, }: {
    /** Onde está montada a parte servidor (o Route Handler `[...caminho]`). */
    base?: string;
    rotulo?: string;
    /** "auto" segue a página (a classe `dark` do <html>). */
    tema?: Tema;
    /** Com a borda e os cantos arredondados (um cartão dentro da página); `false` ocupa a área toda, sem moldura. */
    moldura?: boolean;
    /** Para dar a altura (por omissão, pelo menos 640 px e a altura do contentor). */
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Para o item do menu do software: se a pessoa tem acesso ao suporte (para
 * mostrar o item) e quantas novidades por ler (para o número ao lado).
 *
 *   const { acesso, porLer } = useNovidadesMube()
 *   {acesso && <ItemDoMenu href="/suporte" rotulo="Suporte" contagem={porLer} />}
 */
export declare function useNovidadesMube({ base }?: {
    base?: string;
}): {
    /** Ainda a saber quem é. */
    aCarregar: boolean;
    /** Liberado para o suporte ou gestor dos acessos: o item do menu aparece. */
    acesso: boolean;
    porLer: number;
    /** O aviso mais recente por ler (para uma pista no menu, se quiser). */
    ultimo: NotificacaoLida | null;
};
/**
 * O aviso flutuante: só aparece quando há novidades por ler (uma resposta da
 * equipa, uma mudança de estado, um pedido de aceite ou de credencial) e leva
 * à página do suporte, às Notificações. Não aparece na própria página.
 */
export declare function AvisoMube({ base, href, rotulo, tema, posicao, }: {
    base?: string;
    /** O endereço da página do suporte (onde está o `PaginaMube`). */
    href?: string;
    rotulo?: string;
    tema?: Tema;
    posicao?: "direita" | "esquerda";
}): import("react").ReactPortal | null;
/**
 * O suporte numa janela por cima do software, aberta pelo botão "Suporte" no
 * canto. Continua a funcionar, mas a forma recomendada é a página
 * (`PaginaMube`) com o atalho no menu e o `AvisoMube`.
 */
export declare function ComponenteMube({ base, rotulo, tema, posicao, }: {
    base?: string;
    rotulo?: string;
    tema?: Tema;
    posicao?: "direita" | "esquerda";
}): import("react").ReactPortal | null;
export {};
