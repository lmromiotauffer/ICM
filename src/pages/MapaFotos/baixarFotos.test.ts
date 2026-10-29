import { test } from "node:test";
import assert from "node:assert/strict";
import { baixarFotos, emParalelo, nomeFoto } from "./baixarFotos.ts";

test("nomeFoto: data ISO, sem caracteres inválidos e extensão pelo tipo", () => {
  assert.equal(nomeFoto({ id: "12", data: "05/03/2025", rodovia: "MT 010: Cáceres" }, "image/jpeg"), "2025-03-05_MT-010-Cáceres_12.jpg");
  assert.equal(nomeFoto({ id: "1", data: "05/03/2025", rodovia: 'a*?"<>|\\b' }, "image/png"), "2025-03-05_ab_1.png");
  assert.equal(nomeFoto({ id: "1", data: "05/03/2025", rodovia: "x" }, ""), "2025-03-05_x_1.jpg");
});

test("emParalelo: nunca passa do limite e roda todos", async () => {
  let ativas = 0;
  let maximo = 0;
  const feitos: number[] = [];
  await emParalelo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, async (item) => {
    maximo = Math.max(maximo, ++ativas);
    await new Promise((resolver) => setTimeout(resolver, 5));
    ativas--;
    feitos.push(item);
  });
  assert.equal(maximo, 4);
  assert.deepEqual(feitos.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("baixarFotos: pula e conta falhas, uma foto sai direto, nomes repetidos ganham sufixo", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url === "erro") throw new Error("rede");
    if (url === "404") return new Response(null, { status: 404 });
    if (url === "login") return new Response(new Blob(["<html>"], { type: "text/html" }));
    return new Response(new Blob(["x"], { type: "image/jpeg" }));
  });
  const foto = (url: string, id = "1") => ({ id, url, data: "05/03/2025", rodovia: "MT-010" });
  const progresso: number[] = [];

  const uma = await baixarFotos([foto("ok"), foto("erro"), foto("404"), foto("login")], (feitas) => progresso.push(feitas));
  assert.equal(uma.falhas, 3);
  assert.equal(uma.nome, "2025-03-05_MT-010_1.jpg");
  assert.equal(uma.arquivo?.type, "image/jpeg");
  assert.deepEqual(progresso, [1, 2, 3, 4]);

  const nenhuma = await baixarFotos([foto("erro")], () => {});
  assert.equal(nenhuma.arquivo, null);

  const zip = await baixarFotos([foto("ok"), foto("ok")], () => {});
  assert.equal(zip.falhas, 0);
  assert.match(zip.nome, /^fotos-icm-\d{4}-\d{2}-\d{2}\.zip$/);
  const bytes = new Uint8Array(await zip.arquivo!.arrayBuffer());
  const texto = new TextDecoder().decode(bytes);
  assert.ok(texto.includes("2025-03-05_MT-010_1.jpg") && texto.includes("2025-03-05_MT-010_1-2.jpg"));
});
