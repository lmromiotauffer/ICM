import type { FilterObjectOption } from "@/components/FilterObject/@types/types";

/**
 * Dados novos da 1ª página: substituem a lista (busca, limpar, seleção em massa) ou, com páginas extras já
 * carregadas, só atualizam o estado dos itens, para a lista rolada não voltar ao topo
 */
export const mesclarOpcoes = (anteriores: FilterObjectOption[], novas: FilterObjectOption[], trocar: boolean): FilterObjectOption[] => {
  if (trocar || anteriores.length <= novas.length) return novas;
  const porElemento = new Map(novas.map((opcao) => [opcao.value.qElemNumber, opcao]));
  return anteriores.map((opcao) => porElemento.get(opcao.value.qElemNumber) ?? opcao);
};

/**
 * Página seguinte no fim da lista, sem repetir valores: a página pode ter sido pedida com o tamanho da lista
 * antiga (busca ampliada) e chegar depois de a lista nova já ter esses valores
 */
export const acrescentarOpcoes = (anteriores: FilterObjectOption[], pagina: FilterObjectOption[]): FilterObjectOption[] => {
  const presentes = new Set(anteriores.map((opcao) => opcao.value.qElemNumber));
  return [...anteriores, ...pagina.filter((opcao) => !presentes.has(opcao.value.qElemNumber))];
};
