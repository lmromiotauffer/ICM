import type { FilterConfig } from "@/shared/qlik/filtros";

// Rótulos dos campos selecionados fora da barra de filtros (cliques na matriz, no mapa e nos gráficos)
const fieldLabels: Record<string, string> = {
  "Ano/Mês": "Ano/mês",
  NUANOMES: "Ano/mês",
  DTTEMPO: "Data da vistoria",
  Rodovia: "Rodovia",
  Trecho: "Trecho",
  Município: "Município",
  Região: "Região",
  Avaliador: "Avaliador",
  "Tipo do segmento": "Tipo do segmento",
  "Avaliação condição do segmento": "Condição do segmento",
  "Avaliação da questão": "Problema",
  "Resposta avaliação da questão": "Resposta",
  cdSegmentoRodovia: "Segmento",
  cdAvaliacaoSegmento: "Avaliação",
  cdLevantamento: "Levantamento",
  cdContrato: "Obra em garantia (contrato)",
};

/** Nome do campo numa expressão de filtro: "=[Situação atual do contrato]" vira "Situação atual do contrato" */
export const campoDaExpressao = (expressao: string): string =>
  expressao.replace(/^=/, "").replace(/^\[(.*)\]$/, "$1");

export const getFieldLabel = (field: string, filters: FilterConfig[]): string =>
  filters.find(({ expression }) => campoDaExpressao(expression) === field)?.label ?? fieldLabels[field] ?? field;
