// Modelo do app Qlik "Painel do ICM": questões, referências, escalas e expressões compartilhadas.
// Tudo que pinta uma faixa ou uma condição no painel lê daqui (matriz, mapa, indicadores, trechos).

export type TipoSegmento = "Pavimentado" | "Não pavimentado";
export const tiposSegmento: TipoSegmento[] = ["Pavimentado", "Não pavimentado"];
export const abasTipo = tiposSegmento.map((tipo) => ({ label: tipo, value: tipo }));

/** Nível do problema numa questão (quanto menor a média, melhor) */
export type Faixa = "baixo" | "medio" | "alto";
export const rotuloFaixa: Record<Faixa, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto" };

/** Condição geral do segmento avaliado */
export type Condicao = "Bom" | "Regular" | "Ruim" | "Péssimo";
export const condicoes: Condicao[] = ["Bom", "Regular", "Ruim", "Péssimo"];

export type Questao = {
  id: number;
  rotulo: string;
  tipo: TipoSegmento;
  secao: "Pavimento" | "Conservação";
  // Linhas de referência do app (folhas de índice): a média cai numa das três faixas
  alto: number;
  medio: number;
  baixo: number;
};

// Ordem das folhas do app. "alto" também é a nota máxima da questão: os "alto" de cada seção somam 100
export const questoes: Questao[] = [
  { id: 1, rotulo: "Panela", tipo: "Pavimentado", secao: "Pavimento", alto: 50, medio: 25, baixo: 12.5 },
  { id: 2, rotulo: "Remendo", tipo: "Pavimentado", secao: "Pavimento", alto: 30, medio: 15, baixo: 7.5 },
  { id: 3, rotulo: "Trincamento", tipo: "Pavimentado", secao: "Pavimento", alto: 20, medio: 10, baixo: 5 },
  { id: 4, rotulo: "Drenagem", tipo: "Pavimentado", secao: "Conservação", alto: 20, medio: 10, baixo: 5 },
  { id: 5, rotulo: "Roçada", tipo: "Pavimentado", secao: "Conservação", alto: 30, medio: 15, baixo: 7.5 },
  { id: 6, rotulo: "Sinalização", tipo: "Pavimentado", secao: "Conservação", alto: 50, medio: 25, baixo: 12.5 },
  { id: 10, rotulo: "Panelas/buracos", tipo: "Não pavimentado", secao: "Pavimento", alto: 25, medio: 18.75, baixo: 12.5 },
  { id: 11, rotulo: "Seção transversal imprópria", tipo: "Não pavimentado", secao: "Pavimento", alto: 15, medio: 11.25, baixo: 7.5 },
  { id: 12, rotulo: "Trilha de roda", tipo: "Não pavimentado", secao: "Pavimento", alto: 15, medio: 11.25, baixo: 7.5 },
  { id: 7, rotulo: "Corrugações", tipo: "Não pavimentado", secao: "Pavimento", alto: 30, medio: 22.5, baixo: 15 },
  { id: 8, rotulo: "Drenagem deficiente", tipo: "Não pavimentado", secao: "Pavimento", alto: 10, medio: 7.5, baixo: 5 },
  { id: 9, rotulo: "Excesso de poeira", tipo: "Não pavimentado", secao: "Pavimento", alto: 5, medio: 3.75, baixo: 2.5 },
];

export const questoesDoTipo = (tipo: TipoSegmento) => questoes.filter((questao) => questao.tipo === tipo);

/** Faixa em que uma média cai, pelas referências da questão (mesmos cortes dos gráficos de barras do app) */
export const faixaDaMedia = (valor: number, questao: Questao): Faixa =>
  valor <= questao.baixo ? "baixo" : valor <= questao.medio ? "medio" : "alto";

/** "até 12,5 · Baixo", "de 12,5 a 25 · Médio", "acima de 25 · Alto" */
export const leituraFaixa = (valor: number, questao: Questao): string => {
  const f = (n: number) => n.toLocaleString("pt-BR");
  const faixa = faixaDaMedia(valor, questao);
  if (faixa === "baixo") return `até ${f(questao.baixo)} · Baixo`;
  if (faixa === "medio") return `de ${f(questao.baixo)} a ${f(questao.medio)} · Médio`;
  return `acima de ${f(questao.medio)} · Alto`;
};

// O app mistura Alta/Alto/Ruim, Média/Médio/Regular e Baixa/Baixo/Bom nas respostas; o painel normaliza só na apresentação
export const normalizarResposta = (texto: string | undefined): Faixa | "nenhuma" | null => {
  const t = (texto ?? "").trim().toLowerCase();
  if (!t || t === "-") return null;
  if (t === "nenhuma ocorrência") return "nenhuma";
  if (t === "alto" || t === "alta" || t === "ruim") return "alto";
  if (t === "médio" || t === "média" || t === "regular") return "medio";
  if (t === "baixo" || t === "baixa" || t === "bom") return "baixo";
  return null;
};

// ---------------------------------------------------------------------------------------------
// Expressões Qlik
// ---------------------------------------------------------------------------------------------

export const setTipo = (tipo?: TipoSegmento) => (tipo ? `[Tipo do segmento]={'${tipo}'}` : "");
// interseccao: "*=" mantém o filtro de condição do visitante; "=" o substitui (barra e legenda mostram todas as condições)
export const setCondicao = (lista: Condicao[], interseccao = false) =>
  `[Avaliação condição do segmento]${interseccao ? "*=" : "="}{${lista.map((c) => `'${c}'`).join(",")}}`;

const juntar = (...partes: string[]) => partes.filter(Boolean).join(", ");
const conjunto = (...partes: string[]) => (juntar(...partes) ? `{<${juntar(...partes)}>}` : "");

/** Extensão (km) dos segmentos avaliados que caem no conjunto: cada avaliação de segmento conta uma vez.
 *  Única fórmula de km do painel (KPI, matriz, barras, avaliadores, gráfico por mês); conferiu com o
 *  Sum(kmLevantado) do app ao vivo em 09/10/2026. */
export const kmAvaliado = (...partes: string[]) => {
  const set = conjunto(...partes);
  return `Sum(${set} Aggr(Only(${set} nuKmFimSegmentoRodovia) - Only(${set} nuKmInicioSegmentoRodovia), cdAvaliacaoSegmento))`;
};

/** Média da nota da questão (0 = nenhuma ocorrência; "alto" da questão = nota máxima) */
export const mediaQuestao = (questao: Questao, ...partes: string[]) =>
  `Avg({<[_skAvaliacaoQuestao]={${questao.id}}${juntar(...partes) ? ", " + juntar(...partes) : ""}>} vlResultadoQuestao)`;

/** Parcela da extensão em cada condição, como texto "bom|regular|ruim|péssimo" (0 a 1) numa célula só */
export const parcelasCondicao = (...partes: string[]) =>
  condicoes
    .map((condicao) => `Round(${kmAvaliado(setCondicao([condicao]), ...partes)} / ${kmAvaliado(...partes)}, 0.0001)`)
    .join(" & '|' & ");

export const lerParcelas = (texto: string | undefined): number[] =>
  (texto ?? "").split("|").map((parte) => {
    const numero = parseFloat(parte.replace(",", "."));
    return Number.isFinite(numero) ? numero : 0;
  });

/** Ignora o filtro de tempo (todos os meses com vistoria): gráficos por mês destacam o período em contexto */
export const mesesSemFiltro = "[Ano/Mês]=, NUANOMES=, DTTEMPO=";

/** Os `quantidade` meses mais recentes de "NUANOMES=Ano/Mês;…", como valores de seleção do campo Ano/Mês */
export const ultimosMeses = (lista: string, quantidade: number): { qText: string }[] =>
  lista
    .split(";")
    .map((par) => par.split("="))
    .filter(([numero, texto]) => numero && texto)
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(-quantidade)
    .map(([, texto]) => ({ qText: texto }));

/** "abr/2026 a jul/2026" ou "jul/2026" para o período em contexto */
export const periodoEmContexto =
  "=If(Min(NUANOMES) = Max(NUANOMES), Date(Date#(Min(NUANOMES), 'YYYYMM'), 'MMM/YYYY'), " +
  "Date(Date#(Min(NUANOMES), 'YYYYMM'), 'MMM/YYYY') & ' a ' & Date(Date#(Max(NUANOMES), 'YYYYMM'), 'MMM/YYYY'))";

/** Condição da avaliação mais recente do segmento no período (desempata pelo id da avaliação) */
export const condicaoMaisRecente = "FirstSortedValue(distinct [Avaliação condição do segmento], -(_skTempo * 1E6 + cdAvaliacaoSegmento))";

// ---------------------------------------------------------------------------------------------
// Geometria: o engine entrega "[[lon,lat],[lon,lat],…]"; o Leaflet quer [lat, lon]
// ---------------------------------------------------------------------------------------------

export type Caminho = [number, number][];

export const lerGeometria = (texto: string | undefined): Caminho => {
  if (!texto || texto[0] !== "[") return [];
  try {
    const pontos = JSON.parse(texto) as unknown;
    if (!Array.isArray(pontos)) return [];
    return pontos
      .filter((p): p is [number, number] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([lon, lat]) => [lat, lon]);
  } catch {
    return [];
  }
};

/** Ponto "[lon,lat]" de uma foto: envolto em mais um par de colchetes, vira a lista de um ponto que lerGeometria lê */
export const lerPonto = (texto: string | undefined): [number, number] | null => lerGeometria(texto && `[${texto}]`)[0] ?? null;

export const formatarKm = (valor: number) => `${Math.round(valor).toLocaleString("pt-BR")} km`;

/** "27/10/2026" (DateFormat do app) vira "27 de outubro de 2026"; texto fora do formato volta como veio */
export const dataPorExtenso = (data: string) => {
  const [dia, mes, ano] = data.split("/").map(Number);
  const dt = new Date(ano, mes - 1, dia);
  return Number.isNaN(dt.getTime()) ? data : dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
};

/** Valor do app dentro de HTML montado à mão (tooltips do Leaflet e do ECharts) */
export const escapar = (texto: string) => texto.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
