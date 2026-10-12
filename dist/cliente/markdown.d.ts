import type { PreviaDoLink } from "../tipos.js";
/**
 * O comentário em Markdown (S74.11), sem Tiptap: os tokens do `marked` viram
 * React, nunca HTML. Os links soltos são chips; os do Operacional ficam como
 * texto simples (o cliente não os abre). `escuro`: no balão escuro do cliente.
 */
type Mencao = {
    id: string;
    nome: string | null;
};
export declare function Markdown({ texto, links, mencoes, euId, escuro, }: {
    texto: string;
    links?: Record<string, PreviaDoLink>;
    mencoes?: Mencao[];
    euId?: string;
    escuro?: boolean;
}): import("react/jsx-runtime").JSX.Element;
/** Os cartões dos links de fora por baixo do texto (S74.6): até 3, e "Mostrar mais N". */
export declare function CartoesDosLinks({ texto, links }: {
    texto: string;
    links?: Record<string, PreviaDoLink>;
}): import("react/jsx-runtime").JSX.Element | null;
export {};
