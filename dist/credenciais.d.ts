/**
 * Os modelos de credencial (S63): o que a Mube pede ao cliente e o que o
 * cliente envia pelo componente, com o ícone, a cor do cartão e os campos.
 * Cópia de `lib/credenciais.ts` do Operacional (o componente não o importa):
 * mudar um, mudar o outro. Serve a interface e a parte servidor.
 */
import type { NomeDoIcone } from "./cliente/ui.js";
export type ModeloDeCredencial = "dominio" | "cloudflare" | "alojamento" | "email" | "google" | "meta" | "whatsapp" | "stripe" | "faturacao" | "github" | "chave_api" | "acesso" | "nota";
/** O que se guarda: utilizador e senha, uma chave (um só valor secreto) ou texto livre. */
export type FormaDaCredencial = "acesso" | "chave" | "nota";
export type TomDoCartao = "navy" | "teal" | "sepia" | "rose" | "olive" | "primary";
export interface Modelo {
    nome: string;
    descricao: string;
    icone: NomeDoIcone;
    tom: TomDoCartao;
    forma: FormaDaCredencial;
    /** O rótulo do campo do nome e um exemplo. */
    campoNome: string;
    exemploNome: string;
    /** O nome que já vem preenchido (ex.: "Cloudflare"). */
    nomeFixo?: string;
    /** O endereço do painel, se for sempre o mesmo. */
    url?: string;
    /** O domínio pede onde está registado. */
    registador?: boolean;
    /** Uma pista para as notas (2FA, quem é o titular…). */
    pistaNotas?: string;
}
export declare const MODELOS: Record<ModeloDeCredencial, Modelo>;
export declare const ORDEM_DOS_MODELOS: ModeloDeCredencial[];
export declare const eModelo: (v: unknown) => v is ModeloDeCredencial;
/** O que se envia (fica cifrado na plataforma; nunca volta ao navegador). */
export type CamposDaCredencial = Partial<Record<"utilizador" | "senha" | "notas" | "registador" | "texto", string>>;
