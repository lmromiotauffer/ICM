import type { Cell } from "@cluster-data-experience/qlik-modules";

/**
 * Devolve as células na ordem do engine (dimensões primeiro, depois medidas),
 * que é a ordem assumida por todos os consumidores que leem célula por índice.
 *
 * A lib qlik-modules (>= 2.8.3) envia `qColumnOrder` como "índice original da coluna
 * em cada posição do engine", mas o engine interpreta como "coluna do engine em cada
 * posição da matriz" e devolve as linhas permutadas. Quando dimensões e medidas estão
 * intercaladas na config da página, as duas leituras divergem e as células saem
 * embaralhadas; esta função desfaz a permutação.
 */
export const celulasOrdemEngine = (cells: Cell[], qHyperCube?: EngineAPI.IHyperCube): Cell[] => {
  // As tipagens do engine não declaram qColumnOrder no layout, mas ele vem preenchido
  const qColumnOrder = (qHyperCube as { qColumnOrder?: number[] } | undefined)?.qColumnOrder;
  if (!qColumnOrder?.length) return cells;
  const ordenadas: Cell[] = [];
  qColumnOrder.forEach((colunaEngine, posicao) => {
    ordenadas[colunaEngine] = cells[posicao];
  });
  return ordenadas;
};

/**
 * Posição da coluna do engine na config (inverso de qColumnOrder); sem qColumnOrder, o próprio índice.
 * A lib faz qColumnOrder[i] no índice que recebe em toggleSort e selectCell: é isto que ela espera.
 */
export const posicaoNaConfig = (qColumnOrder: number[] | undefined, indiceEngine: number): number => {
  const posicao = qColumnOrder?.indexOf(indiceEngine) ?? -1;
  return posicao === -1 ? indiceEngine : posicao;
};
