import { test } from "node:test";
import assert from "node:assert/strict";
import type { FilterObjectOption } from "@/components/FilterObject/@types/types";
import { acrescentarOpcoes, mesclarOpcoes } from "./opcoesFiltro.ts";

const opcoes = (...elementos: number[]): FilterObjectOption[] =>
  elementos.map((qElemNumber) => ({ value: { qElemNumber, qText: `v${qElemNumber}`, qNum: undefined }, label: `v${qElemNumber}`, selected: false }));
const elementos = (lista: FilterObjectOption[]) => lista.map((opcao) => opcao.value.qElemNumber);

test("mesclarOpcoes: com trocar, a 1ª página nova substitui a lista rolada", () => {
  assert.deepEqual(elementos(mesclarOpcoes(opcoes(1, 2, 3, 4), opcoes(7, 8), true)), [7, 8]);
});

test("mesclarOpcoes: sem trocar e com páginas extras, só atualiza o estado e mantém a lista rolada", () => {
  const novas = opcoes(1, 2);
  novas[1].selected = true;
  const resultado = mesclarOpcoes(opcoes(1, 2, 3, 4), novas, false);
  assert.deepEqual(elementos(resultado), [1, 2, 3, 4]);
  assert.equal(resultado[1].selected, true);
});

test("acrescentarOpcoes: página pedida com o tamanho da lista antiga não repete valores (busca ampliada)", () => {
  // Busca de 7 para 40 resultados: a página qTop 7 chega depois de a lista já ter os 40
  const lista = opcoes(...Array.from({ length: 40 }, (_, i) => i));
  const pagina = opcoes(...Array.from({ length: 33 }, (_, i) => i + 7));
  assert.deepEqual(elementos(acrescentarOpcoes(lista, pagina)), elementos(lista));
  assert.deepEqual(elementos(acrescentarOpcoes(opcoes(0, 1), opcoes(1, 2, 3))), [0, 1, 2, 3]);
});
