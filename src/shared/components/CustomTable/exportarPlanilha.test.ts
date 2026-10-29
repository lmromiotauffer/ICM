import { test } from "node:test";
import assert from "node:assert/strict";
import type { Cell, Column } from "@cluster-data-experience/qlik-modules";
import { cabecalhosPlanilha, linhasPlanilha, mapaVisualParaEngine, paginasExportacao } from "./exportarPlanilha.ts";

// Dimensão e medida intercaladas na config, como no ranking (posição, fornecedor, BDP)
const colunas = [
  { type: "measure", qDef: "Only(Rank)", qLabel: "Posição" },
  { type: "dimension", qFieldDefs: ["nmCredor"], qFieldLabels: ["Fornecedor"] },
  { type: "measure", qDef: "Avg(MedBDP)", qLabel: "BDP" },
] as Column[];

// Células na ordem do engine: a dimensão vem antes das duas medidas
const linha = [
  { qText: "Construtora A" },
  { qText: "1º", qNum: 1 },
  { qText: "8,25", qNum: 8.25 },
] as Cell[];

test("mapaVisualParaEngine: medidas apontam para depois das dimensões", () => {
  assert.deepEqual(mapaVisualParaEngine(colunas), [1, 0, 2]);
});

test("cabecalhosPlanilha usa o rótulo da config, com 'Coluna' na falta", () => {
  assert.deepEqual(cabecalhosPlanilha(colunas), ["Posição", "Fornecedor", "BDP"]);
  assert.deepEqual(cabecalhosPlanilha([{ type: "measure", qDef: "1" } as Column]), ["Coluna"]);
});

test("linhasPlanilha: ordem da config, medidas como número e dimensões como texto", () => {
  assert.deepEqual(linhasPlanilha([linha], colunas), [[1, "Construtora A", 8.25]]);
});

test("linhasPlanilha: dimensão numérica (alinhamento direita) sai como número", () => {
  const nota = [{ type: "dimension", qFieldDefs: ["vlNota"], qFieldLabels: ["Nota"], alinhamento: "direita" }] as (Column & { alinhamento?: string })[];
  assert.deepEqual(linhasPlanilha([[{ qText: "8,50", qNum: 8.5 } as Cell]], nota), [[8.5]]);
});

test("paginasExportacao: páginas de linhas inteiras dentro de 10 mil células, a última com o resto", () => {
  assert.deepEqual(paginasExportacao(2500, 10), [
    { qTop: 0, qLeft: 0, qWidth: 10, qHeight: 1000 },
    { qTop: 1000, qLeft: 0, qWidth: 10, qHeight: 1000 },
    { qTop: 2000, qLeft: 0, qWidth: 10, qHeight: 500 },
  ]);
  assert.deepEqual(paginasExportacao(0, 10), []);
  // 17 colunas (cadastro): 588 × 17 = 9.996 células; 589 passariam do limite
  assert.equal(paginasExportacao(1000, 17)[0].qHeight, 588);
});

test("linhasPlanilha: medida sem número e célula nula viram texto ou vazio", () => {
  const semNumero = [{ qText: "Construtora B" }, { qText: "-", qNum: "NaN" }, undefined] as unknown as Cell[];
  assert.deepEqual(linhasPlanilha([semNumero], colunas), [["-", "Construtora B", ""]]);
});
