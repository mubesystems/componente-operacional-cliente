/**
 * A parte servidor do componente, a instalar no software do cliente (K16,
 * requisito 13 do mapa do v1). Num só Route Handler do Next:
 *
 *   // app/api/mube/[...caminho]/route.ts
 *   import { criarRotasMube, armazemSupabase } from "@mubesystems/componente-operacional/servidor"
 *   export const { GET, POST, PUT, PATCH, DELETE } = criarRotasMube({
 *     utilizador: async () => { … quem tem sessão no software do cliente … },
 *     armazem: armazemSupabase(supabaseComServiceRole),
 *   })
 *
 * O navegador só fala com estas rotas; a chave do projeto fica aqui (requisito
 * 1). Quem pede é sempre o utilizador da sessão do software do cliente, nunca
 * um id vindo do navegador.
 */
import type { Armazem } from "./armazem.js";
import type { PessoaDaEquipa, Utilizador } from "../tipos.js";
export { armazemEmMemoria, armazemSupabase, type Armazem } from "./armazem.js";
export type { PessoaDaEquipa, Utilizador } from "../tipos.js";
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
     * vê o separador "Acessos"; `liberado` e `drive`, se vierem, sobrepõem-se à
     * escolha feita lá (S14, S18).
     */
    utilizador: (request: Request) => Promise<Utilizador | null>;
    /** A equipa do software do cliente, de onde o gestor escolhe quem tem acesso ao suporte. */
    equipa?: () => Promise<PessoaDaEquipa[]>;
    /** Onde fica a cópia do estado. */
    armazem: Armazem;
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
