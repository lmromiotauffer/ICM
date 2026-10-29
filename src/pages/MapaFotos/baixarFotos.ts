import { gerarZip } from "../../shared/utils/zip.ts";

/** Mais que isso por vez trava a aba ou o navegador bloqueia */
export const LIMITE_DOWNLOAD = 50;

type FotoParaBaixar = { id: string; url: string; data: string; rodovia: string };

/** `{data}_{rodovia}_{id}.{ext}`, com a data dd/mm/aaaa como aaaa-mm-dd: ordena e não tem barra, inválida em nome de arquivo */
export const nomeFoto = ({ id, data, rodovia }: Pick<FotoParaBaixar, "id" | "data" | "rodovia">, tipo: string) =>
  `${data.split("/").reverse().join("-")}_${rodovia}_${id}`.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-") + (tipo === "image/png" ? ".png" : ".jpg");

/** Roda `tarefa` em todos os itens, no máximo `limite` ao mesmo tempo */
export const emParalelo = async <T>(itens: T[], limite: number, tarefa: (item: T, indice: number) => Promise<void>) => {
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const indice = proximo++;
      await tarefa(itens[indice], indice);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
};

/** Baixa as fotos (4 por vez) e monta um arquivo só: a própria foto, se for uma, ou um ZIP. As que falham são puladas e contadas. */
export const baixarFotos = async (fotos: FotoParaBaixar[], aoProgredir: (feitas: number) => void) => {
  const baixadas: { foto: FotoParaBaixar; blob: Blob }[] = [];
  let feitas = 0;
  await emParalelo(fotos, 4, async (foto, indice) => {
    try {
      // reload: a miniatura (<img>, sem CORS) pode ter deixado no cache uma resposta sem o cabeçalho CORS.
      // O timeout impede que uma conexão pendurada segure o download inteiro
      const resposta = await fetch(foto.url, { cache: "reload", signal: AbortSignal.timeout(30_000) });
      const blob = resposta.ok ? await resposta.blob() : null;
      // Redirecionamento para o login volta 200 com HTML: não é foto
      if (blob?.type.startsWith("image/")) baixadas[indice] = { foto, blob };
    } catch {
      // Falha de rede ou timeout: a foto fica de fora e entra na contagem de falhas
    } finally {
      aoProgredir(++feitas);
    }
  });
  const usados = new Set<string>();
  const arquivos = baixadas.filter(Boolean).map(({ foto, blob }) => {
    let nome = nomeFoto(foto, blob.type);
    for (let n = 2; usados.has(nome); n++) nome = nomeFoto({ ...foto, id: `${foto.id}-${n}` }, blob.type);
    usados.add(nome);
    return { nome, blob };
  });
  const falhas = fotos.length - arquivos.length;
  if (arquivos.length <= 1) return { arquivo: arquivos[0]?.blob ?? null, nome: arquivos[0]?.nome ?? "", falhas };
  const entradas = await Promise.all(arquivos.map(async ({ nome, blob }) => ({ nome, dados: new Uint8Array(await blob.arrayBuffer()) })));
  // sv-SE formata a data local como aaaa-mm-dd (toISOString usaria UTC e viraria o dia à noite)
  return { arquivo: new Blob([gerarZip(entradas)], { type: "application/zip" }), nome: `fotos-icm-${new Date().toLocaleDateString("sv-SE")}.zip`, falhas };
};
