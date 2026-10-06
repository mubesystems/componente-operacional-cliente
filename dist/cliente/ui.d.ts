import { type ReactNode } from "react";
import { ICONES } from "../gerado/icones";
import type { Estado } from "../tipos";
export type NomeDoIcone = keyof typeof ICONES;
export declare function Icone({ nome, tamanho, className, rotulo }: {
    nome: NomeDoIcone;
    tamanho?: number;
    className?: string;
    rotulo?: string;
}): import("react/jsx-runtime").JSX.Element;
declare const ESTILO: {
    readonly primario: "mube:bg-primary mube:text-primary-foreground mube:hover:bg-primary-hover mube:disabled:bg-muted mube:disabled:text-muted-foreground";
    readonly secundario: "mube:border mube:border-input mube:bg-card mube:text-foreground mube:hover:bg-muted mube:disabled:text-muted-foreground";
    readonly fantasma: "mube:text-foreground mube:hover:bg-muted mube:disabled:text-muted-foreground";
    readonly destrutivo: "mube:bg-destructive mube:text-destructive-foreground mube:hover:bg-destructive-hover";
};
declare const TAMANHO: {
    readonly sm: "mube:h-8 mube:px-3 mube:text-label-sm";
    readonly md: "mube:h-10 mube:px-4 mube:text-label";
    readonly lg: "mube:h-12 mube:px-5 mube:text-label";
};
export declare function Botao({ estilo, tamanho, icone, aCarregar, className, children, ...resto }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    estilo?: keyof typeof ESTILO;
    tamanho?: keyof typeof TAMANHO;
    icone?: NomeDoIcone;
    aCarregar?: boolean;
}): import("react/jsx-runtime").JSX.Element;
export declare function BotaoIcone({ icone, rotulo, onClick, className }: {
    icone: NomeDoIcone;
    rotulo: string;
    onClick?: () => void;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function Rodinha(): import("react/jsx-runtime").JSX.Element;
export declare const ESTADOS_EM_ORDEM: Estado[];
export declare const rotuloDoEstado: (e: Estado) => string;
export declare function SeloDeEstado({ estado }: {
    estado: Estado;
}): import("react/jsx-runtime").JSX.Element;
export declare function SeloDePrioridade({ valor, rotulo }: {
    valor: string;
    rotulo: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function Janela({ titulo, descricao, aoFechar, rodape, largura, children, }: {
    titulo: string;
    descricao?: ReactNode;
    aoFechar: () => void;
    rodape?: ReactNode;
    largura?: string;
    children?: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function Vazio({ icone, titulo, texto, acao }: {
    icone: NomeDoIcone;
    titulo: string;
    texto?: string;
    acao?: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function ErroAoCarregar({ texto, aoTentar }: {
    texto: string;
    aoTentar: () => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function Esqueleto({ className }: {
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
/** "26 set" (as partes, para não depender de como o navegador junta dia e mês). */
export declare function dia(iso: string): string;
export declare const diaEHora: (iso: string) => string;
export declare function haQuanto(iso: string): string;
export declare function tamanho(bytes: number): string;
export {};
