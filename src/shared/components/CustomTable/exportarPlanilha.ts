import type { Cell, Column } from "@cluster-data-experience/qlik-modules";

export const contarDimensoes = (colunas: Column[]) => colunas.filter((coluna) => coluna.type === "dimension").length;

/** Para cada coluna na ordem da config, o índice dela no engine (dimensões primeiro, depois medidas) */
export const mapaVisualParaEngine = (colunas: Column[]): number[] => {
  const numDims = contarDimensoes(colunas);
  let dimensao = 0;
  let medida = 0;
  return colunas.map((coluna) => (coluna.type === "dimension" ? dimensao++ : numDims + medida++));
};

// O engine devolve no máximo 10 mil células por chamada (somando as páginas pedidas):
// uma chamada por página, senão ele recusa com "Result too large"
const CELULAS_POR_CHAMADA = 10000;

/** Páginas de linhas inteiras, do topo ao fim da tabela, cada uma dentro do limite de células do engine */
export const paginasExportacao = (totalRows: number, qcx: number): EngineAPI.INxPage[] => {
  const alturaPagina = Math.max(1, Math.floor(CELULAS_POR_CHAMADA / qcx));
  const paginas: EngineAPI.INxPage[] = [];
  for (let qTop = 0; qTop < totalRows; qTop += alturaPagina) {
    paginas.push({ qTop, qLeft: 0, qWidth: qcx, qHeight: Math.min(alturaPagina, totalRows - qTop) });
  }
  return paginas;
};

export const cabecalhosPlanilha = (colunas: Column[]): string[] =>
  colunas.map((coluna) => (coluna.type === "dimension" ? coluna.qFieldLabels?.[0] : coluna.qLabel) || "Coluna");

/**
 * Linhas da planilha a partir das células na ordem do engine: medidas e dimensões numéricas (alinhamento "direita",
 * ex.: nota) como número, para o Excel somar e ordenar; as demais dimensões como texto
 */
export const linhasPlanilha = (matriz: Cell[][], colunas: (Column & { alinhamento?: string })[]): (string | number)[][] => {
  const mapa = mapaVisualParaEngine(colunas);
  const numerica = colunas.map((coluna) => coluna.type !== "dimension" || coluna.alinhamento === "direita");
  return matriz.map((celulas) =>
    mapa.map((indice, visual) => {
      const celula = celulas[indice];
      const numero = celula?.qNum;
      if (numerica[visual] && typeof numero === "number" && Number.isFinite(numero)) return numero;
      return celula?.qText || "";
    }),
  );
};
