import { test } from "node:test";
import assert from "node:assert/strict";
import { dataPorExtenso, faixaDaMedia, lerGeometria, lerParcelas, lerPonto, normalizarResposta, questoes, setCondicao, ultimosMeses } from "./icm.ts";

test("faixaDaMedia: limites da Panela (12,5 / 25)", () => {
  const panela = questoes.find((q) => q.id === 1)!;
  assert.equal(faixaDaMedia(12.5, panela), "baixo");
  assert.equal(faixaDaMedia(12.6, panela), "medio");
  assert.equal(faixaDaMedia(25.01, panela), "alto");
});

test("os 'alto' de cada seção somam a nota máxima da seção (100)", () => {
  for (const [tipo, secao] of [["Pavimentado", "Pavimento"], ["Pavimentado", "Conservação"], ["Não pavimentado", "Pavimento"]] as const) {
    assert.equal(questoes.filter((q) => q.tipo === tipo && q.secao === secao).reduce((soma, q) => soma + q.alto, 0), 100, tipo + " " + secao);
  }
});

test("lerGeometria: [lon,lat] vira [lat,lon]; texto inválido vira lista vazia", () => {
  assert.deepEqual(lerGeometria("[[-56.08,-15.57],[-56.09,-15.58]]"), [[-15.57, -56.08], [-15.58, -56.09]]);
  assert.deepEqual(lerGeometria("-"), []);
  assert.deepEqual(lerGeometria("[[1,"), []);
});

test("lerPonto: par simples '[lon,lat]' do engine vira [lat,lon]; nulo do Qlik vira null", () => {
  assert.deepEqual(lerPonto("[-55.7430989,-15.1588791]"), [-15.1588791, -55.7430989]);
  assert.equal(lerPonto("-"), null);
  assert.equal(lerPonto(undefined), null);
});

test("dataPorExtenso: dd/MM/yyyy por extenso; texto fora do formato volta igual", () => {
  assert.equal(dataPorExtenso("27/10/2026"), "27 de outubro de 2026");
  assert.equal(dataPorExtenso("-"), "-");
});

test("lerParcelas: vírgula decimal e texto ausente", () => {
  assert.deepEqual(lerParcelas("0,4362|0,25|0,1|0,2138"), [0.4362, 0.25, 0.1, 0.2138]);
  assert.deepEqual(lerParcelas(undefined), [0]);
});

test("normalizarResposta: sinônimos do app viram a mesma faixa", () => {
  assert.equal(normalizarResposta("Alta"), "alto");
  assert.equal(normalizarResposta("Regular"), "medio");
  assert.equal(normalizarResposta("Bom"), "baixo");
  assert.equal(normalizarResposta("Nenhuma ocorrência"), "nenhuma");
  assert.equal(normalizarResposta("-"), null);
});

test("setCondicao: '=' substitui o filtro do visitante; interseção usa '*='", () => {
  assert.equal(setCondicao(["Bom"]), "[Avaliação condição do segmento]={'Bom'}");
  assert.equal(setCondicao(["Ruim", "Péssimo"], true), "[Avaliação condição do segmento]*={'Ruim','Péssimo'}");
});

test("ultimosMeses: ordena pelo NUANOMES, ignora pares vazios e fica com os mais recentes", () => {
  const lista = "202605=mai/2026;202512=dez/2025;;202607=jul/2026;202601=jan/2026;=sem número;202606=jun/2026";
  assert.deepEqual(ultimosMeses(lista, 4), [{ qText: "jan/2026" }, { qText: "mai/2026" }, { qText: "jun/2026" }, { qText: "jul/2026" }]);
  assert.deepEqual(ultimosMeses("", 4), []);
});
