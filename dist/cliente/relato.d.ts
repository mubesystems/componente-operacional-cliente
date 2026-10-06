import type { Api } from "./api";
import type { TicketDetalhe } from "../tipos";
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
export declare function GravadorDeAudio({ aoGravar, gravado, aoRetirar }: {
    aoGravar: (blob: Blob, segundos: number) => void;
    gravado?: {
        segundos: number;
    } | null;
    aoRetirar?: () => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function NovoRelato({ aoFechar, aoCriar }: {
    aoFechar: () => void;
    aoCriar: (t: TicketDetalhe) => void;
}): import("react/jsx-runtime").JSX.Element;
