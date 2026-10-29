import { test } from "node:test";
import assert from "node:assert/strict";
import type { Cell } from "@cluster-data-experience/qlik-modules";
import { celulasOrdemEngine, posicaoNaConfig } from "./celulasOrdemEngine.ts";

const medida = { qText: "7,5" } as Cell;
const dimensao = { qText: "set 2026" } as Cell;
const cubo = (qColumnOrder?: number[]) => ({ qColumnOrder }) as unknown as EngineAPI.IHyperCube;

test("desfaz a permutação do qColumnOrder: dimensões voltam antes das medidas", () => {
  assert.deepEqual(celulasOrdemEngine([medida, dimensao], cubo([1, 0])), [dimensao, medida]);
});

test("sem qColumnOrder (ou vazio) devolve as células como vieram", () => {
  assert.deepEqual(celulasOrdemEngine([dimensao, medida], cubo()), [dimensao, medida]);
  assert.deepEqual(celulasOrdemEngine([dimensao, medida], cubo([])), [dimensao, medida]);
  assert.deepEqual(celulasOrdemEngine([dimensao, medida], undefined), [dimensao, medida]);
});

test("posicaoNaConfig: ranking [medida, dimensão, medida] tem qColumnOrder [1,0,2]; a dimensão (engine 0) está na posição 1", () => {
  assert.equal(posicaoNaConfig([1, 0, 2], 0), 1);
  assert.equal(posicaoNaConfig([1, 0, 2], 1), 0);
  assert.equal(posicaoNaConfig([1, 0, 2], 2), 2);
  assert.equal(posicaoNaConfig(undefined, 3), 3);
});
