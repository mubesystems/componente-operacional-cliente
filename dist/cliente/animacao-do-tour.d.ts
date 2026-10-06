import { DURACAO_DAS_SECOES } from "./animacoes-das-secoes.js";
export declare const ANIMACAO_DO_TOUR: {
    readonly largura: 362;
    readonly altura: 170;
    readonly fps: 30;
    readonly duracao: 360;
};
export declare function AnimacaoDoTour(): import("react/jsx-runtime").JSX.Element;
export type CenaDoTour = "convite" | keyof typeof DURACAO_DAS_SECOES;
/** O `<Player>` em loop, com a cena pedida (o convite ou a de uma secção). Carrega-se só quando aparece (React.lazy). */
export default function PalcoDoTour({ cena }: {
    cena?: CenaDoTour;
}): import("react/jsx-runtime").JSX.Element;
