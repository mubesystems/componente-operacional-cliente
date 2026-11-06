import type { Api } from "./api.js";
import type { TicketDetalhe } from "../tipos.js";
export interface Envio {
    chave: string;
    nome: string;
    tipo: string;
    bytes: number;
    progresso: number;
    estado: "a_enviar" | "enviado" | "falhou";
    id?: string;
    erro?: string;
    audio?: boolean;
}
export declare function useEnvios(api: Api): {
    envios: Envio[];
    juntar: (ficheiros: (File | {
        blob: Blob;
        nome: string;
        audio?: boolean;
    })[]) => `${string}-${string}-${string}-${string}-${string}`[];
    retirar: (chave: string) => void;
    limpar: () => void;
    ids: string[];
    aEnviar: boolean;
    falhados: boolean;
};
export declare function ListaDeEnvios({ envios, aoRetirar }: {
    envios: Envio[];
    aoRetirar: (chave: string) => void;
}): import("react/jsx-runtime").JSX.Element | null;
/** Zona de soltar ficheiros (Figma: Upload). */
export declare function ZonaDeSoltar({ aoEscolher, texto, ajuda }: {
    aoEscolher: (f: File[]) => void;
    texto?: string;
    ajuda?: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Gravar áudio (v0.8.0): enquanto grava, o tempo e a onda do volume real; no
 * fim, o áudio com a onda, para ouvir, regravar ou retirar. `aoEstado` diz a
 * quem usa que está a gravar (o formulário esconde o texto e trava o envio).
 */
export declare function GravadorDeAudio({ aoGravar, gravado, aoRetirar, aoEstado, }: {
    aoGravar: (blob: Blob, segundos: number) => void;
    gravado?: {
        segundos: number;
    } | null;
    aoRetirar?: () => void;
    aoEstado?: (aGravar: boolean) => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function NovoRelato({ aoFechar, aoCriar, soSugestao, aoSugerir, }: {
    aoFechar: () => void;
    aoCriar?: (t: TicketDetalhe) => void;
    /** v0.8.0: aberto na secção Sugestões, sem a escolha entre erro e sugestão. */
    soSugestao?: boolean;
    aoSugerir?: () => void;
}): import("react/jsx-runtime").JSX.Element;
