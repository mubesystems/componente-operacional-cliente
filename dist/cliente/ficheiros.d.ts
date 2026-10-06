/** O rótulo do ícone: a extensão (até 4 letras) ou o da família. Áudio gravado (.webm) mostra MP3, como antes. */
export declare function tipoDoFicheiro(nome: string, tipoMime?: string): string;
/** Figma: Folder & File / File. Tamanhos sm 40, md 72, lg 96. */
export declare function Ficheiro({ nome, tipoMime, tamanho }: {
    nome: string;
    tipoMime?: string;
    tamanho?: number;
}): import("react/jsx-runtime").JSX.Element;
/** Figma: Folder & File / Folder, na cor neutra do Embed (identidade neutra, K2). */
export declare function Pasta({ largura }: {
    largura?: number;
}): import("react/jsx-runtime").JSX.Element;
