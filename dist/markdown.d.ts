import { type Token } from "marked";
/**
 * O Markdown dos comentários (S74.11): o lexer do `marked` com GFM e uma quebra
 * simples como quebra (S74.2), como no Operacional. Partilhado pela interface
 * (desenhar) e pela parte servidor (o excerto da notificação, S74.13).
 */
export declare function tokensDoMarkdown(md: string): Token[];
export declare const dominioDe: (url: string) => string;
/** Os links de fora pela ordem, sem repetidos e sem os de dentro de código. */
export declare function linksDoMarkdown(md: string | null | undefined): string[];
declare const desescapar: (t: string) => string;
/** O texto corrido, sem marcas: um link solto conta como o domínio (S74.13). */
export declare function textoDoMarkdown(md: string | null | undefined, max?: number): string;
export { desescapar };
