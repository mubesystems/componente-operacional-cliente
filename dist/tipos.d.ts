/**
 * O que a plataforma devolve (docs/v1/api-do-componente.md), tal como o
 * componente o usa. Partilhado entre a parte servidor e a interface.
 */
import type { ModeloDeCredencial } from "./credenciais.js";
export type Estado = "relato" | "triagem" | "contencao" | "correcao" | "em_validacao" | "aguardando_aceite" | "concluida" | "descartada";
export type Impacto = "impede" | "contorno" | "incomoda" | "cosmetico";
export interface Ficheiro {
    id: string;
    nome: string;
    tipo_mime: string;
    tamanho_bytes: number;
    /** URL de leitura assinada, por uma hora. */
    url?: string;
}
export interface TicketResumo {
    id: string;
    numero: number;
    codigo: string;
    titulo: string;
    estado: Estado;
    estado_rotulo: string;
    prioridade: {
        valor: string;
        rotulo: string;
    } | null;
    prazo: string | null;
    reaberturas: number;
    criado_em: string;
    atualizado_em: string;
    descarte?: {
        rotulo: string;
        motivo: string | null;
    };
    aceite?: {
        tipo: "explicito" | "tacito";
        em: string;
    };
    /** Quem relatou (o primeiro relato), com o id do seu software. */
    relatado_por?: {
        id: string;
        nome: string | null;
        foto_url: string | null;
    } | null;
    /** O que o cliente vê: comentários externos e anexos (do relato e desses comentários). */
    contagens?: {
        comentarios: number;
        anexos: number;
    };
}
export interface Comentario {
    id: string;
    resposta_a: string | null;
    autor: {
        tipo: "cliente";
        id: string;
        nome: string | null;
        foto_url: string | null;
    } | {
        tipo: "mube";
        nome: string;
        foto_url: string | null;
    };
    corpo: string | null;
    apagado: boolean;
    editado: boolean;
    criado_em: string;
    anexos: Ficheiro[];
    /** Pessoas da sua equipa mencionadas pela equipa da Mube (os ids do seu software). */
    mencoes?: {
        id: string;
        nome: string | null;
    }[];
}
export interface TicketDetalhe extends TicketResumo {
    relatos: {
        id: string;
        texto: string | null;
        impacto: Impacto;
        recebido_em: string;
        utilizador: {
            id: string;
            nome: string | null;
        } | null;
        anexos: Ficheiro[];
    }[];
    comentarios: Comentario[];
    linha_do_tempo: {
        estado: Estado;
        em: string;
    }[];
    aceite_tacito?: {
        envios_com_sucesso: number;
        retido: boolean;
    };
}
/** O ticket como fica na cópia do cliente: o detalhe quando já foi lido, senão o resumo. */
export type TicketNaCopia = TicketResumo & Partial<Pick<TicketDetalhe, "relatos" | "comentarios" | "linha_do_tempo" | "aceite_tacito">>;
export interface PastaDaDrive {
    id: string;
    pasta_id: string | null;
    nome: string;
    do_cliente: boolean;
    criada_por?: {
        id: string;
        nome: string | null;
    } | null;
    criada_em: string;
}
export interface ItemDaDrive {
    id: string;
    pasta_id: string | null;
    nome: string;
    tipo_mime: string;
    tamanho_bytes: number;
    do_cliente: boolean;
    enviado_por?: {
        id: string;
        nome: string | null;
    } | null;
    criado_em: string;
}
export interface Drive {
    pastas: PastaDaDrive[];
    itens: ItemDaDrive[];
}
export type TipoDeNotificacao = "estado" | "comentario" | "mencao" | "aceite_pendente" | "concluido" | "recebido" | "aviso" | "credencial";
export interface Notificacao {
    id: string;
    tipo: TipoDeNotificacao;
    ticket_numero: number | null;
    titulo: string;
    corpo: string | null;
    criado_em: string;
    /** Quem foi mencionado (ids do software do cliente): para essas pessoas, o aviso é uma menção. */
    mencionados?: string[] | null;
}
export interface NotificacaoLida extends Notificacao {
    lida: boolean;
}
/** Quem está a usar o software do cliente, como a parte servidor o identifica. */
export interface Utilizador {
    id: string;
    nome?: string | null;
    email?: string | null;
    fotoUrl?: string | null;
    /**
     * S14, S18: liberado para o suporte. Sem este campo, vale a escolha feita no
     * separador "Acessos" (guardada na cópia).
     */
    liberado?: boolean;
    /** Vê a Drive. Sem este campo, vale a escolha feita em "Acessos" (por omissão, sim). */
    drive?: boolean;
    /** Vê e envia as credenciais (S63). Sem este campo, vale a escolha feita em "Acessos" (por omissão, não). */
    credenciais?: boolean;
    /** Gere os acessos ao suporte (vê o separador "Acessos"). */
    gestor?: boolean;
}
/** Alguém da equipa do software do cliente, para o gestor escolher quem tem acesso. */
export type PessoaDaEquipa = Omit<Utilizador, "liberado" | "drive" | "credenciais" | "gestor">;
/** Quem tem acesso ao suporte e se vê a Drive e as credenciais (só valem com o suporte). */
export interface Liberado {
    id: string;
    drive: boolean;
    credenciais: boolean;
}
export interface Sessao {
    utilizador: {
        id: string;
        nome: string | null;
    } | null;
    liberado: boolean;
    /** Vê a Drive: sem isto, o separador não aparece. */
    drive: boolean;
    /** Vê e envia as credenciais (S63): sem isto, o separador não aparece. */
    credenciais: boolean;
    gestor: boolean;
    /** O tour guiado (S65): feito, dispensado ou ainda não (o banner aparece). Fica no banco do próprio software. */
    tour?: EstadoDoTour | null;
}
export type EstadoDoTour = "concluido" | "dispensado";
export interface Acessos {
    equipa: (PessoaDaEquipa & {
        liberado: boolean;
        drive: boolean;
        credenciais: boolean;
    })[];
}
/** Um pedido da equipa da Mube por responder (S63). */
export interface PedidoDeCredencial {
    id: string;
    modelo: ModeloDeCredencial;
    titulo: string;
    descricao: string | null;
    pedido_por: {
        nome: string;
    };
    criado_em: string;
}
/** Uma credencial enviada daqui: só o nome, nunca o valor. */
export interface CredencialEnviada {
    id: string;
    modelo: ModeloDeCredencial;
    nome: string;
    url: string | null;
    enviada_por: {
        id: string;
        nome: string | null;
    };
    enviada_em: string;
    atualizada_em: string;
    pedido_id: string | null;
}
export interface Credenciais {
    pedidos: PedidoDeCredencial[];
    enviadas: CredencialEnviada[];
}
export interface ErroDaApi {
    erro: {
        codigo: string;
        mensagem: string;
    };
}
