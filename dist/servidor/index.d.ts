/**
 * A parte servidor do componente, a instalar no software do cliente (K16,
 * requisito 13 do mapa do v1). Num só Route Handler do Next:
 *
 *   // app/api/mube/[...caminho]/route.ts
 *   import { criarRotasMube, armazemSupabase } from "@mubesystems/componente-operacional/servidor"
 *   export const { GET, POST, PUT, PATCH, DELETE } = criarRotasMube({
 *     utilizador: async () => { … quem tem sessão no software do cliente … },
 *     armazem: armazemSupabase(supabaseComServiceRole),
 *     // conversas: true,   // as conversas com a Mube (v0.6.0), desligadas por omissão
 *     // relatosAbertos: true,   // qualquer pessoa reporta (v0.7.0), desligado por omissão
 *   })
 *
 * O navegador só fala com estas rotas; a chave do projeto fica aqui (requisito
 * 1). Quem pede é sempre o utilizador da sessão do software do cliente, nunca
 * um id vindo do navegador.
 */
import type { Armazem } from "./armazem.js";
import type { Estado, EstadoDaSugestao, PessoaDaEquipa, TicketNaCopia, Utilizador } from "../tipos.js";
export { armazemEmMemoria, armazemSupabase, type Armazem, type ArmazemDeConversas } from "./armazem.js";
export type { ConversaMube, Estado, MembroDaMube, MensagemMube, PessoaDaEquipa, TicketNaCopia, Utilizador } from "../tipos.js";
/**
 * Uma mudança de estado de um ticket (o evento `estado` do webhook), para o
 * gancho `aoMudarTicket` (v0.7.0). `relatadoPor` vem do próprio
 * evento: valem mesmo quando a cópia não conseguiu ler o ticket.
 */
export interface MudancaDeTicket {
    /** O ticket como ficou na cópia (sem os URLs assinados). */
    ticket: TicketNaCopia;
    estado: Estado;
    estadoAnterior: Estado | null;
    /** Quem relatou, com o id do seu software; null se o ticket nasceu na Mube. */
    relatadoPor: {
        id: string;
        nome: string | null;
    } | null;
}
export interface ConfiguracaoMube {
    /** Endereço do Operacional. Por omissão, `MUBE_URL`. */
    url?: string;
    /** Chave de API do projeto. Por omissão, `MUBE_CHAVE`. */
    chave?: string;
    /** Por omissão, `MUBE_CLIENTE_ID`. */
    clienteId?: string;
    /** Por omissão, `MUBE_PROJETO_ID`. */
    projetoId?: string;
    /**
     * Quem está com sessão no software do cliente. Sem sessão: null. `gestor`
     * vê o separador "Acessos"; `liberado`, `drive` e `credenciais`, se vierem,
     * sobrepõem-se à escolha feita lá (S14, S18, S59, S63).
     */
    utilizador: (request: Request) => Promise<Utilizador | null>;
    /** A equipa do software do cliente, de onde o gestor escolhe quem tem acesso ao suporte. */
    equipa?: () => Promise<PessoaDaEquipa[]>;
    /** Onde fica a cópia do estado. */
    armazem: Armazem;
    /**
     * As conversas com a Mube (v0.6.0): o grupo geral, as TaskForces e as
     * individuais, para mostrar no chat do software. **Desligadas por omissão**
     * (D9): sem a opção, o pacote faz o mesmo que a v0.5. Ligadas, declara-as à
     * plataforma ao arrancar (`PUT /api/v1/capacidades`), envia a `equipa` ao
     * arrancar e de hora a hora, e abre as rotas `conversas/*` e `equipa-mube`.
     * `false` (explícito) diz à plataforma que as desligou.
     */
    conversas?: boolean;
    /**
     * D8: chamado depois de cada mudança guardada numa conversa, com os ids (do
     * software) de quem a vê. Para o software mandar o seu sinal de tempo real
     * ao navegador dessas pessoas; os hooks voltam a ler pela rota do servidor.
     */
    aoMudarConversas?: (conversaId: string, utilizadoresIds: string[]) => void | Promise<void>;
    /**
     * v0.7.0: qualquer pessoa com sessão no software pode reportar um erro ou
     * uma sugestão (`POST relatos` e o envio dos ficheiros do relato), liberada
     * ou não. Ler os tickets, comentar, aceitar e recusar continua só para os
     * liberados. **Desligado por omissão**: sem a opção, quem não está liberado
     * recebe `403 nao_liberado`, como até à 0.6.
     */
    relatosAbertos?: boolean;
    /**
     * v0.7.0: chamado em cada mudança de estado de um ticket (evento `estado`
     * do webhook), depois de a cópia se atualizar. Para o software avisar quem
     * reportou (ex.: quem não está liberado e não vê os tickets). Um erro aqui
     * fica no log e não falha o webhook; o evento não volta a ser tratado.
     * O webhook tem de responder em 10 s: o gancho espera-se até 5 s, e o que
     * demorar mais deve ir para uma fila (ou o `after()` do Next).
     */
    aoMudarTicket?: (mudanca: MudancaDeTicket) => void | Promise<void>;
    /**
     * v0.8.0: chamado quando a Mube decide uma sugestão ou ela fica feita (evento
     * `sugestao` do webhook), para o software avisar quem sugeriu. Um erro aqui
     * fica no log e não falha o webhook; o evento não volta a ser tratado.
     */
    aoMudarSugestao?: (mudanca: MudancaDeSugestao) => void | Promise<void>;
}
/** Uma sugestão que mudou de estado, para o gancho `aoMudarSugestao` (v0.8.0). */
export interface MudancaDeSugestao {
    sugestao: {
        numero: number;
        codigo: string;
        titulo: string;
    };
    estado: EstadoDaSugestao;
    estadoAnterior: EstadoDaSugestao | null;
    /** A resposta da Mube, quando há. */
    resposta: string | null;
    /** O id no software do cliente de quem sugeriu. */
    sugeridoPor: {
        id: string;
    } | null;
}
export declare function criarRotasMube(config: ConfiguracaoMube): {
    GET: (request: Request, contexto: {
        params: Promise<{
            caminho?: string[];
        }>;
    }) => Promise<Response>;
    POST: (request: Request, contexto: {
        params: Promise<{
            caminho?: string[];
        }>;
    }) => Promise<Response>;
    PUT: (request: Request, contexto: {
        params: Promise<{
            caminho?: string[];
        }>;
    }) => Promise<Response>;
    PATCH: (request: Request, contexto: {
        params: Promise<{
            caminho?: string[];
        }>;
    }) => Promise<Response>;
    DELETE: (request: Request, contexto: {
        params: Promise<{
            caminho?: string[];
        }>;
    }) => Promise<Response>;
};
/**
 * A lista de quem o software do cliente liberou neste projeto (S14, S18).
 * Chamar quando a lista muda (e uma vez na instalação): quem não vier deixa de
 * estar liberado na plataforma.
 */
export declare function sincronizarLiberados(utilizadores: Omit<Utilizador, "liberado" | "gestor">[], config?: Pick<ConfiguracaoMube, "url" | "chave" | "clienteId" | "projetoId">): Promise<{
    liberados: number;
    entraram: number;
    sairam: number;
}>;
/**
 * A equipa do software do cliente, para as conversas (D3): quem não vier sai
 * da equipa e deixa de ver as conversas. Com `conversas: true` o servidor já a
 * envia ao arrancar e de hora a hora; chamar isto quando a equipa muda.
 */
export declare function sincronizarEquipaMube(pessoas: PessoaDaEquipa[], config?: Pick<ConfiguracaoMube, "url" | "chave" | "clienteId" | "projetoId">): Promise<{
    equipa: number;
    entraram: number;
    sairam: number;
}>;
