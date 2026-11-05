import type { CamposDaCredencial, ModeloDeCredencial } from "../credenciais.js";
import type { Acessos, ConversaMube, Credenciais, Drive, EstadoDoTour, Ficheiro, MembroDaMube, MensagemMube, NotificacaoLida, Sessao, TicketDetalhe, TicketNaCopia } from "../tipos.js";
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
        credenciais: boolean;
    }[]) => Promise<{
        liberados: number;
        comDrive: number;
        comCredenciais?: number;
    }>;
    credenciais: () => Promise<Credenciais>;
    marcarTour: (estado: EstadoDoTour) => Promise<unknown>;
    enviarCredencial: (corpo: {
        modelo: ModeloDeCredencial;
        nome?: string;
        url?: string;
        campos: CamposDaCredencial;
        pedidoId?: string;
    }) => Promise<unknown>;
    editarCredencial: (id: string, corpo: {
        nome?: string;
        url?: string;
        campos: CamposDaCredencial;
    }) => Promise<unknown>;
    revelarCredencial: (id: string) => Promise<{
        conteudo: CamposDaCredencial;
    }>;
    retirarCredencial: (id: string) => Promise<unknown>;
    enviar: (ficheiro: Blob, nome: string, aoProgresso?: (fracao: number) => void, sinal?: AbortSignal, caminho?: string) => Promise<Ficheiro>;
    conversas: () => Promise<{
        conversas: ConversaMube[];
        defasado: boolean;
    }>;
    equipaMube: () => Promise<{
        membros: MembroDaMube[];
        conversaIndividual: boolean;
    }>;
    mensagens: (conversaId: string, antes?: string | null) => Promise<{
        conversa: ConversaMube;
        mensagens: MensagemMube[];
        seguinte: string | null;
        defasado: boolean;
    }>;
    escrever: (conversaId: string, corpo: string, opcoes?: {
        respostaA?: string | null;
        ficheiros?: string[];
    }) => Promise<{
        mensagem: MensagemMube;
    }>;
    editarMensagem: (conversaId: string, mensagemId: string, corpo: string) => Promise<unknown>;
    apagarMensagem: (conversaId: string, mensagemId: string) => Promise<unknown>;
    marcarConversaLida: (conversaId: string, ate?: string) => Promise<unknown>;
    abrirIndividual: (pessoaId: string) => Promise<{
        conversa: ConversaMube;
        criada: boolean;
    }>;
    enviarParaConversa: (ficheiro: Blob, nome: string, aoProgresso?: (fracao: number) => void, sinal?: AbortSignal) => Promise<Ficheiro>;
};
export type Api = ReturnType<typeof criarApi>;
