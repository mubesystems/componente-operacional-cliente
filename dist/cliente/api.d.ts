import type { Acessos, Drive, Ficheiro, NotificacaoLida, Sessao, TicketDetalhe, TicketNaCopia } from "../tipos";
export declare class ErroDoSuporte extends Error {
    readonly codigo: string;
    readonly estado: number;
    constructor(mensagem: string, codigo: string, estado: number);
}
export type TicketNaLista = TicketNaCopia & {
    nao_lido?: boolean;
};
/** O navegador só fala com a parte servidor do software do cliente (nunca com a plataforma). */
export declare function criarApi(base: string): {
    sessao: () => Promise<Sessao>;
    tickets: () => Promise<{
        tickets: TicketNaLista[];
    }>;
    ticket: (numero: number) => Promise<{
        ticket: TicketDetalhe;
        defasado: boolean;
    }>;
    relatar: (corpo: {
        texto?: string;
        impacto: string;
        ficheiros: string[];
        chaveIdempotencia: string;
    }) => Promise<{
        ticket: TicketDetalhe;
        repetido: boolean;
    }>;
    comentar: (numero: number, corpo: string, respostaA?: string | null, ficheiros?: string[]) => Promise<unknown>;
    aceitar: (numero: number) => Promise<unknown>;
    recusar: (numero: number, motivo: string, ficheiros: string[]) => Promise<unknown>;
    drive: () => Promise<Drive>;
    criarPasta: (nome: string, pastaId: string | null) => Promise<unknown>;
    porNaDrive: (ficheiroId: string, pastaId: string | null) => Promise<unknown>;
    mudar: (tipo: "pasta" | "item", id: string, mudanca: {
        nome?: string;
        pastaId?: string | null;
    }) => Promise<unknown>;
    apagar: (tipo: "pasta" | "item", id: string) => Promise<unknown>;
    urlDoItem: (id: string, descarregar?: boolean) => Promise<{
        url: string;
    }>;
    notificacoes: () => Promise<{
        notificacoes: NotificacaoLida[];
    }>;
    marcarLidas: (ids: string[] | "todas") => Promise<unknown>;
    acessos: () => Promise<Acessos>;
    definirAcessos: (acessos: {
        id: string;
        drive: boolean;
    }[]) => Promise<{
        liberados: number;
        comDrive: number;
    }>;
    enviar: (ficheiro: Blob, nome: string, aoProgresso?: (fracao: number) => void, sinal?: AbortSignal) => Promise<Ficheiro>;
};
export type Api = ReturnType<typeof criarApi>;
