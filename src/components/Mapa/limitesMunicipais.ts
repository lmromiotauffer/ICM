import type { FeatureCollection, Geometry } from "geojson";

const URL_MALHA = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima";
const URL_MUNICIPIOS = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/51/municipios";

/** A malha do IBGE só traz properties.codarea; o nome vem da lista de municípios, cujo id é o mesmo código */
export const nomesPorCodigo = (municipios: { id: number | string; nome: string }[]) => new Map(municipios.map(({ id, nome }) => [String(id), nome]));

/** Polígono vira só o contorno: o Leaflet testa clique e hover dentro de polígono mesmo sem preenchimento,
 *  e o município inteiro capturaria o mouse */
export const contorno = (geometria: Geometry): Geometry =>
  geometria.type === "Polygon"
    ? { type: "MultiLineString", coordinates: geometria.coordinates }
    : geometria.type === "MultiPolygon"
      ? { type: "MultiLineString", coordinates: geometria.coordinates.flat() }
      : geometria;

const buscarJson = async (url: string) => {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`);
  return resposta.json();
};

// Uma busca por sessão; se falhar, limpa para tentar de novo na próxima vez que a camada ligar
let carregamento: Promise<{ malha: FeatureCollection; nomes: Map<string, string> }> | null = null;

/** Limites municipais de Mato Grosso (IBGE) com o nome de cada município */
export const carregarLimites = () =>
  (carregamento ??= Promise.all([buscarJson(URL_MALHA), buscarJson(URL_MUNICIPIOS)])
    .then(([malha, municipios]: [FeatureCollection, { id: number; nome: string }[]]) => ({
      malha: { ...malha, features: malha.features.map((municipio) => ({ ...municipio, geometry: contorno(municipio.geometry) })) },
      nomes: nomesPorCodigo(municipios),
    }))
    .catch((erro: unknown) => {
      carregamento = null;
      throw erro;
    }));
