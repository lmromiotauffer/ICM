import { test } from "node:test";
import assert from "node:assert/strict";
import { carregarLimites, contorno, nomesPorCodigo } from "./limitesMunicipais.ts";

test("contorno: polígonos viram linhas com todos os anéis", () => {
  const anel = [[0, 0], [1, 0], [1, 1], [0, 0]];
  assert.deepEqual(contorno({ type: "Polygon", coordinates: [anel] }), { type: "MultiLineString", coordinates: [anel] });
  assert.deepEqual(contorno({ type: "MultiPolygon", coordinates: [[anel], [anel, anel]] }), { type: "MultiLineString", coordinates: [anel, anel, anel] });
});

test("nomesPorCodigo: o id numérico casa com o codarea em texto", () => {
  const nomes = nomesPorCodigo([{ id: 5103403, nome: "Cuiabá" }, { id: "5108402", nome: "Várzea Grande" }]);
  assert.equal(nomes.get("5103403"), "Cuiabá");
  assert.equal(nomes.get("5108402"), "Várzea Grande");
});

test("carregarLimites: busca uma vez e, se falhar, tenta de novo na próxima chamada", async (t) => {
  let falhar = true;
  const busca = t.mock.method(globalThis, "fetch", async (url: string) =>
    falhar ? new Response(null, { status: 503 }) : Response.json(url.includes("malhas") ? { type: "FeatureCollection", features: [] } : [{ id: 1, nome: "A" }]),
  );
  await assert.rejects(carregarLimites());
  falhar = false;
  const { nomes } = await carregarLimites();
  await carregarLimites();
  assert.equal(nomes.get("1"), "A");
  assert.equal(busca.mock.callCount(), 4);
});
