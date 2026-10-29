import type { SegmentoMapa } from "./MapaMalha.tsx";

/** Limites da área visível: [[sul, oeste], [norte, leste]] */
export type Area = [[number, number], [number, number]];

/** Segmentos cujo retângulo envolvente toca a área: pega também o trecho reto que atravessa a tela sem vértice dentro dela */
export const idsNaArea = (segmentos: SegmentoMapa[], [[sul, oeste], [norte, leste]]: Area) =>
  [
    ...new Set(
      segmentos
        .filter(({ caminho }) => {
          if (caminho.length === 0) return false;
          const lats = caminho.map(([lat]) => lat);
          const lons = caminho.map(([, lon]) => lon);
          return Math.min(...lats) <= norte && Math.max(...lats) >= sul && Math.min(...lons) <= leste && Math.max(...lons) >= oeste;
        })
        .map((s) => s.id),
    ),
  ];

const xml = (texto: string) => texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c);

// O KML guarda a cor como aabbggrr
const corKml = (hex: string) => (/^#[0-9a-f]{6}$/i.test(hex) ? `ff${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}` : "ff888888").toLowerCase();

/** KML dos segmentos, um estilo por condição, para abrir no Google Earth ou no QGIS */
export const gerarKml = (segmentos: SegmentoMapa[], cores: Record<string, string>) => {
  const estilos = Object.entries(cores)
    .map(([condicao, cor]) => `<Style id="${xml(condicao)}"><LineStyle><color>${corKml(cor)}</color><width>4</width></LineStyle></Style>`)
    .join("");
  const marcas = segmentos
    .filter((s) => s.caminho.length > 1)
    .map(
      (s) =>
        `<Placemark><name>${xml(`${s.rodovia} km ${s.kmInicio} a ${s.kmFim}`)}</name>` +
        `<description>${xml(`${s.trecho} · Condição: ${s.condicao || "-"}`)}</description>` +
        (cores[s.condicao] ? `<styleUrl>#${xml(s.condicao)}</styleUrl>` : "") +
        `<LineString><coordinates>${s.caminho.map(([lat, lon]) => `${lon},${lat}`).join(" ")}</coordinates></LineString></Placemark>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Segmentos ICM</name>${estilos}\n${marcas}\n</Document></kml>`;
};
