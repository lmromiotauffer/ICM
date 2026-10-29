/** Entrega um arquivo gerado no navegador (KML, ZIP de fotos) como download */
export const baixarArquivo = (conteudo: Blob | string, nome: string, tipo?: string) => {
  const url = URL.createObjectURL(typeof conteudo === "string" ? new Blob([conteudo], { type: tipo }) : conteudo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  // O clique só agenda o download (o Firefox pode esperar a escolha da pasta): revogar cedo cancela
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
