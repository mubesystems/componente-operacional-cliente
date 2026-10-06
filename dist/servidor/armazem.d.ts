import type { Liberado, Notificacao, NotificacaoLida, TicketNaCopia } from "../tipos";
/**
 * A cópia só de leitura do estado, do lado do cliente (requisito 13 do mapa do
 * v1). O webhook escreve, o componente lê: os tickets aparecem mesmo que a
 * plataforma esteja em baixo.
 */
export interface Armazem {
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
    /** Quem o gestor do software liberou para o suporte (S14, S18), com os ids do software do cliente, e se vê a Drive. */
    liberados(): Promise<Liberado[]>;
    definirLiberados(lista: Liberado[]): Promise<void>;
}
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
/**
 * No Supabase do cliente, nas tabelas de `sql/componente-mube.sql`. Use o
 * cliente com a service role: as tabelas têm RLS ligada e nenhuma política.
 */
export declare function armazemSupabase(supabase: ClienteSupabase, opcoes?: {
    prefixo?: string;
}): Armazem;
export {};
