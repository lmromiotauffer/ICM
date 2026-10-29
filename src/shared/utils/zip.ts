const tabelaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export const crc32 = (dados: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of dados) crc = tabelaCrc[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * ZIP sem compressão (método 0): as fotos já são JPEG, comprimir não ganha nada.
 * Sem ZIP64: serve enquanto o total ficar abaixo de 4 GB.
 */
export const gerarZip = (entradas: { nome: string; dados: Uint8Array }[], quando = new Date()) => {
  const codificador = new TextEncoder();
  const hora = (quando.getHours() << 11) | (quando.getMinutes() << 5) | (quando.getSeconds() >> 1);
  const dia = ((quando.getFullYear() - 1980) << 9) | ((quando.getMonth() + 1) << 5) | quando.getDate();
  const itens = entradas.map(({ nome, dados }) => ({ nome: codificador.encode(nome), dados, crc: crc32(dados) }));
  const tamanhoLocais = itens.reduce((soma, { nome, dados }) => soma + 30 + nome.length + dados.length, 0);
  const tamanhoCentral = itens.reduce((soma, { nome }) => soma + 46 + nome.length, 0);
  const zip = new Uint8Array(tamanhoLocais + tamanhoCentral + 22);
  const visao = new DataView(zip.buffer);
  const u16 = (pos: number, valor: number) => visao.setUint16(pos, valor, true);
  const u32 = (pos: number, valor: number) => visao.setUint32(pos, valor, true);
  // Trecho igual nos dois cabeçalhos: versão, flags, método, data/hora, CRC, tamanhos e nome
  const camposComuns = (pos: number, { nome, dados, crc }: (typeof itens)[number]) => {
    u16(pos, 20);
    u16(pos + 2, 0x0800); // bit 11: nome em UTF-8, senão o Explorer estraga os acentos
    u16(pos + 4, 0);
    u16(pos + 6, hora);
    u16(pos + 8, dia);
    u32(pos + 10, crc);
    u32(pos + 14, dados.length);
    u32(pos + 18, dados.length);
    u16(pos + 22, nome.length);
  };
  let local = 0;
  let central = tamanhoLocais;
  for (const item of itens) {
    u32(local, 0x04034b50);
    camposComuns(local + 4, item);
    zip.set(item.nome, local + 30);
    zip.set(item.dados, local + 30 + item.nome.length);
    u32(central, 0x02014b50);
    u16(central + 4, 20);
    camposComuns(central + 6, item);
    u32(central + 42, local);
    zip.set(item.nome, central + 46);
    local += 30 + item.nome.length + item.dados.length;
    central += 46 + item.nome.length;
  }
  u32(central, 0x06054b50);
  u16(central + 8, itens.length);
  u16(central + 10, itens.length);
  u32(central + 12, tamanhoCentral);
  u32(central + 16, tamanhoLocais);
  return zip;
};
