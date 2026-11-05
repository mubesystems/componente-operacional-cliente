import type { ConversaMube, Ficheiro, MensagemMube } from "../tipos.js";
/**
 * Para o software chamar quando recebe o seu sinal de tempo real (o que ele
 * emitiu em `aoMudarConversas`): as conversas e, se indicada, essa conversa
 * voltam a ler já.
 */
export declare function recarregarConversasMube(conversaId?: string, base?: string): void;
/**
 * As conversas da pessoa da sessão com a Mube (D7: só as que ela vê) e os
 * membros da Mube do projeto (só para quem pode ter conversa individual).
 *
 * - `grupos`: o geral e as TaskForces, para a lista de grupos do chat;
 * - `individuais`: as conversas individuais já abertas;
 * - `membrosMube`: para o fim da lista da equipa; tocar num abre a individual (`abrirIndividual`).
 */
export declare function useConversasMube({ base }?: {
    base?: string;
}): {
    ativo: boolean | null;
    aCarregar: boolean;
    erro: string | null;
    defasado: boolean;
    conversas: ConversaMube[];
    grupos: ConversaMube[];
    individuais: ConversaMube[];
    membrosMube: import(".").PessoaNaConversa[];
    /** A pessoa pode ter conversa individual com a Mube (a Mube marcou-a). */
    conversaIndividual: boolean;
    /** A individual já aberta com este membro da Mube, se houver. */
    individualCom: (pessoaId: string) => ConversaMube | null;
    naoLidos: number;
    abrirIndividual: (pessoaId: string) => Promise<ConversaMube>;
    recarregar: () => Promise<void>;
};
/** O número de mensagens por ler nas conversas com a Mube, para o menu do software. */
export declare function useNaoLidosMube({ base }?: {
    base?: string;
}): {
    ativo: boolean | null;
    naoLidos: number;
};
/**
 * Uma conversa aberta: as mensagens (da mais antiga para a mais recente),
 * enviar, editar e apagar as próprias, marcar como lida e as anteriores.
 * `conversaId` nulo: nada aberto.
 */
export declare function useMensagensMube(conversaId: string | null, { base }?: {
    base?: string;
}): {
    conversa: ConversaMube | null;
    mensagens: MensagemMube[];
    aCarregar: boolean;
    erro: string | null;
    defasado: boolean;
    haMais: boolean;
    porPagina: number;
    carregarAnteriores: () => Promise<void>;
    enviar: (corpo: string, opcoes?: {
        respostaA?: string | null;
        ficheiros?: string[];
    }) => Promise<MensagemMube>;
    enviarFicheiro: (ficheiro: Blob, nome: string, aoProgresso?: (fracao: number) => void, sinal?: AbortSignal) => Promise<Ficheiro>;
    editar: (mensagemId: string, corpo: string) => Promise<void>;
    apagar: (mensagemId: string) => Promise<void>;
    marcarLida: () => Promise<void>;
};
