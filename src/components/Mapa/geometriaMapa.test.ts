import { test } from "node:test";
import assert from "node:assert/strict";
import type { SegmentoMapa } from "./MapaMalha.tsx";
import { gerarKml, idsNaArea } from "./geometriaMapa.ts";

const segmento = (id: string, caminho: [number, number][], condicao = "Bom"): SegmentoMapa => ({ id, caminho, condicao, rodovia: "MT-010", trecho: "A & B", kmInicio: "0,0", kmFim: "1,0" });

test("idsNaArea: conta o segmento que só cruza a área e não repete ids", () => {
  const segmentos = [segmento("1", [[-15, -56], [-14, -55]]), segmento("2", [[-10, -50], [-9, -49]]), segmento("1", [[-15, -56], [-15.1, -56]])];
  assert.deepEqual(idsNaArea(segmentos, [[-14.5, -55.5], [-13, -54]]), ["1"]);
});

test("idsNaArea: trecho reto que atravessa a área sem vértice dentro dela", () => {
  assert.deepEqual(idsNaArea([segmento("3", [[-14.2, -57], [-14.2, -53]])], [[-14.5, -55.5], [-13, -54]]), ["3"]);
});

test("gerarKml: lon,lat, cor aabbggrr e texto escapado", () => {
  const kml = gerarKml([segmento("1", [[-15, -56], [-14, -55]])], { Bom: "#17703f" });
  assert.match(kml, /<coordinates>-56,-15 -55,-14<\/coordinates>/);
  assert.match(kml, /<color>ff3f7017<\/color>/);
  assert.match(kml, /A &amp; B/);
  assert.match(kml, /<styleUrl>#Bom<\/styleUrl>/);
});
