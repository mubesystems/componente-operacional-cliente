export type SecaoDoTour = "suporte" | "tickets" | "drive" | "credenciais" | "notificacoes" | "acessos";
/**
 * O convite ao tour, a flutuar no canto inferior direito, como o convite às
 * push do Operacional (362 px). No telemóvel, por cima da barra das secções.
 */
export declare function BannerDoTour({ aoComecar, aoDispensar }: {
    aoComecar: () => void;
    aoDispensar: () => void;
}): import("react/jsx-runtime").JSX.Element;
export declare function Tour({ secoes, aoSair, aoConcluir }: {
    secoes: SecaoDoTour[];
    aoSair: () => void;
    aoConcluir: () => void;
}): import("react/jsx-runtime").JSX.Element;
