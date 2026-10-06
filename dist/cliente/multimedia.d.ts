import type { Ficheiro as FicheiroDaApi } from "../tipos.js";
export declare const tipoDeMedia: (mime: string) => "imagem" | "video" | "audio" | null;
/** Leitor de áudio e vídeo: play, tempo, barra (também pelas setas) e velocidade. */
export declare function Leitor({ url, tipo, nome, grande, aoAmpliar }: {
    url: string;
    tipo: "audio" | "video";
    nome: string;
    grande?: boolean;
    aoAmpliar?: () => void;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Os anexos de um relato ou comentário: imagens em miniatura (abrem o
 * lightbox), áudio e vídeo com leitor, o resto com o File do Figma.
 */
export declare function Anexos({ anexos, compacto }: {
    anexos: FicheiroDaApi[];
    compacto?: boolean;
}): import("react/jsx-runtime").JSX.Element | null;
