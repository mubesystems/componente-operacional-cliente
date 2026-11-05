import type { ConversaMube, EstadoDoTour, Liberado, MensagemMube, Notificacao, NotificacaoLida, TicketNaCopia } from "../tipos.js";
/**
 * A cópia só de leitura do estado, do lado do cliente (requisito 13 do mapa do
 * v1). O webhook escreve, o componente lê: os tickets aparecem mesmo que a
 * plataforma esteja em baixo.
 */
/**
 * A cópia das conversas com a Mube (v0.6.0). Só se usa com `conversas: true`;
 * por isso é opcional num armazém feito à mão para a v0.4.
 */
export interface ArmazemDeConversas {
    /** Junta ao que havia, e troca a lista de participantes de cada uma. */
    guardarConversas(lista: ConversaMube[]): Promise<void>;
    conversa(id: string): Promise<ConversaMube | null>;
    /** D7: as conversas por arquivar em que esta pessoa (id do software) participa. */
    conversasDe(utilizadorId: string): Promise<ConversaMube[]>;
    /** Os ids (do software) de quem participa, para avisar o software quando muda. */
    participantesDe(conversaId: string): Promise<string[]>;
    /** Uma linha por mensagem: repetir não duplica; uma apagada não volta, uma editada não desfaz a edição. */
    guardarMensagens(lista: MensagemMube[]): Promise<void>;
    /** Da mais antiga para a mais recente; `antes` (ISO) dá as anteriores. */
    mensagens(conversaId: string, opcoes?: {
        antes?: string | null;
        limite?: number;
    }): Promise<MensagemMube[]>;
    marcarConversaLida(conversaId: string, utilizadorId: string, ate: string): Promise<void>;
    /** Os por ler de cada conversa, contados na cópia (a plataforma em baixo). */
    porLer(utilizadorId: string, conversaIds: string[]): Promise<Map<string, number>>;
}
export interface Armazem extends Partial<ArmazemDeConversas> {
    tickets(): Promise<TicketNaCopia[]>;
    ticket(numero: number): Promise<TicketNaCopia | null>;
    /** Junta ao que já havia: um resumo não apaga o detalhe guardado antes. */
    guardarTickets(tickets: TicketNaCopia[]): Promise<void>;
    /** Já se fez a primeira cópia completa? */
    sincronizado(): Promise<boolean>;
    marcarSincronizado(): Promise<void>;
    /** true na primeira vez que vê este evento; false se já o tinha (o webhook pode repetir). */
    eventoNovo(id: string): Promise<boolean>;
    guardarNotificacao(n: Notificacao): Promise<void>;
    notificacoes(utilizadorId: string, limite?: number): Promise<NotificacaoLida[]>;
    marcarLidas(utilizadorId: string, ids: string[] | "todas"): Promise<void>;
    /** Quem o gestor do software liberou para o suporte (S14, S18), com os ids do software do cliente, e se vê a Drive e as credenciais. */
    liberados(): Promise<Liberado[]>;
    definirLiberados(lista: Liberado[]): Promise<void>;
    /** Se a pessoa já fez (ou dispensou) o tour guiado (S65): nunca vai à plataforma. */
    tour(utilizadorId: string): Promise<EstadoDoTour | null>;
    marcarTour(utilizadorId: string, estado: EstadoDoTour): Promise<void>;
}
/**
 * Os eventos podem chegar fora de ordem: uma mensagem apagada não volta, e
 * uma editada não volta ao texto original.
 */
export declare function juntarMensagem(antes: MensagemMube | null | undefined, nova: MensagemMube): MensagemMube;
/** Em memória: para desenvolvimento e testes. Perde-se ao reiniciar o servidor. */
export declare function armazemEmMemoria(): Armazem;
/**
 * O mínimo de um cliente Supabase que o armazém usa (o `createClient` com a
 * service role do projeto do cliente). Assim o pacote não depende do
 * `@supabase/supabase-js`.
 */
type ClienteSupabase = {
    from: (tabela: string) => any;
};
export declare function armazemSupabase(supabase: ClienteSupabase, opcoes?: {
    prefixo?: string;
}): Armazem;
export {};
