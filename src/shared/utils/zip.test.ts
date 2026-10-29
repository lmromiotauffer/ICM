import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { crc32 as crc32Zlib } from "node:zlib";
import { crc32, gerarZip } from "./zip.ts";

test("crc32: valor canônico e igual ao do zlib", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
  for (const tamanho of [1, 7, 1000, 65537]) {
    const dados = new Uint8Array(randomBytes(tamanho));
    assert.equal(crc32(dados), crc32Zlib(dados));
  }
});

test("gerarZip: cabeçalhos, flag UTF-8 e diretório central apontando para os cabeçalhos locais", () => {
  const dados = new TextEncoder().encode("abc");
  const zip = gerarZip([{ nome: "Cáceres.jpg", dados }, { nome: "b.jpg", dados: new Uint8Array() }]);
  const visao = new DataView(zip.buffer);
  const nome = new TextEncoder().encode("Cáceres.jpg");
  assert.equal(visao.getUint32(0, true), 0x04034b50);
  assert.equal(visao.getUint16(6, true), 0x0800);
  assert.equal(visao.getUint32(14, true), crc32(dados));
  assert.deepEqual(zip.slice(30, 30 + nome.length), nome);
  assert.deepEqual(zip.slice(30 + nome.length, 33 + nome.length), dados);
  const fim = zip.length - 22;
  assert.equal(visao.getUint32(fim, true), 0x06054b50);
  assert.equal(visao.getUint16(fim + 10, true), 2);
  const inicioCentral = visao.getUint32(fim + 16, true);
  assert.equal(inicioCentral + visao.getUint32(fim + 12, true), fim);
  const segundaCentral = inicioCentral + 46 + nome.length;
  assert.equal(visao.getUint32(segundaCentral, true), 0x02014b50);
  assert.equal(visao.getUint16(segundaCentral + 8, true), 0x0800);
  assert.equal(visao.getUint32(visao.getUint32(segundaCentral + 42, true), true), 0x04034b50);
});
