import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair, Download, ScanSearch } from "lucide-react";
import { useTheme } from "@/shared/contexts/ThemeContext";
// O pan/zoom do fitBounds é JS (PosAnimation do Leaflet) e escapa do CSS de movimento reduzido
import { movimentoReduzido } from "@/shared/hooks/useMovimentoReduzido";
import { useCoresGrafico } from "@/components/Graficos/base";
import { mostrarAviso } from "@/components/Aviso/Aviso";
import { Button } from "@/components/shadcn/button";
import { condicoes, escapar, type Caminho, type Condicao } from "@/shared/qlik/icm";
import { baixarArquivo } from "@/shared/utils/baixarArquivo";
import { cn } from "@/shared/utils/tailwind/cn";
import { gerarKml, idsNaArea } from "./geometriaMapa";
import { carregarLimites } from "./limitesMunicipais";

export type SegmentoMapa = {
  id: string;
  caminho: Caminho;
  condicao: string;
  rodovia: string;
  trecho: string;
  kmInicio: string;
  kmFim: string;
};

export type ObraMapa = { caminho: Caminho; contrato: string; descricao: string };

export type FotoMapa = { id: string; ponto: [number, number]; rodovia: string; data: string };

type Props = {
  segmentos: SegmentoMapa[];
  obras: ObraMapa[];
  fotos: FotoMapa[];
  // Segmento selecionado no Qlik: ganha o anel azul e o mapa centra nele
  selecionado: string | null;
  verLimites: boolean;
  // A malha do IBGE não carregou: a página desmarca a camada
  aoFalharLimites: () => void;
  aoClicarSegmento: (id: string) => void;
  aoClicarFoto: (id: string) => void;
  // Seleciona no Qlik os segmentos que aparecem na tela
  aoFiltrarArea: (ids: string[]) => void;
  className?: string;
};

const atribuicaoOsm = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const atribuicaoEsri = "Tiles &copy; Esri";
const esri = (servico: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/${servico}/MapServer/tile/{z}/{y}/{x}`;

// Só os mapas desenhados invertem no tema escuro; a foto de satélite inverteria em negativo
const mapasBase = {
  mapa: { rotulo: "Mapa", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", atribuicao: atribuicaoOsm, inverteNoEscuro: true },
  ruas: { rotulo: "Ruas", url: esri("World_Street_Map"), atribuicao: atribuicaoEsri, inverteNoEscuro: true },
  satelite: { rotulo: "Satélite", url: esri("World_Imagery"), atribuicao: atribuicaoEsri, inverteNoEscuro: false },
};
type MapaBase = keyof typeof mapasBase;

// Mato Grosso inteiro, antes de os dados chegarem
const centroMT: L.LatLngTuple = [-13.2, -55.9];

/** Mapa da malha: segmentos pela condição, obras em garantia, pontos de foto e limites municipais, sobre tiles do OpenStreetMap */
export const MapaMalha = ({ segmentos, obras, fotos, selecionado, verLimites, aoFalharLimites, aoClicarSegmento, aoClicarFoto, aoFiltrarArea, className }: Props) => {
  const { isDark } = useTheme();
  const cores = useCoresGrafico();
  const [base, setBase] = useState<MapaBase>("mapa");
  const elemento = useRef<HTMLDivElement>(null);
  const limitesSegmentos = useRef(L.latLngBounds([]));
  const mapa = useRef<L.Map | null>(null);
  const camadaTiles = useRef<L.TileLayer | null>(null);
  const camadaObras = useRef(L.layerGroup());
  const camadaSegmentos = useRef(L.layerGroup());
  const camadaFotos = useRef(L.layerGroup());
  const camadaSelecao = useRef(L.layerGroup());
  // Enquadra de novo só quando o conjunto de segmentos muda de verdade (filtro), não ao clicar num trecho
  const assinaturaEnquadrada = useRef("");
  const aoClicarSegmentoAtual = useRef(aoClicarSegmento);
  const aoClicarFotoAtual = useRef(aoClicarFoto);
  const aoFalharLimitesAtual = useRef(aoFalharLimites);
  useEffect(() => {
    aoClicarSegmentoAtual.current = aoClicarSegmento;
    aoClicarFotoAtual.current = aoClicarFoto;
    aoFalharLimitesAtual.current = aoFalharLimites;
  });

  useEffect(() => {
    if (!elemento.current || mapa.current) return;
    // tolerance: o hover no canvas só pega a meia espessura da linha; sem folga, o limite de 1px fica impossível de acertar
    const instancia = L.map(elemento.current, { preferCanvas: true, renderer: L.canvas({ tolerance: 4 }), center: centroMT, zoom: 6, minZoom: 5, maxZoom: 18, zoomControl: true, attributionControl: true });
    camadaObras.current.addTo(instancia);
    camadaSegmentos.current.addTo(instancia);
    camadaSelecao.current.addTo(instancia);
    camadaFotos.current.addTo(instancia);
    mapa.current = instancia;
    // O cartão muda de tamanho com o menu lateral: o Leaflet precisa remedir
    const observador = new ResizeObserver(() => instancia.invalidateSize());
    observador.observe(elemento.current);
    return () => {
      observador.disconnect();
      instancia.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapa.current) return;
    camadaTiles.current?.remove();
    // Os tiles são os mesmos nos dois temas; no escuro, a classe .tiles-escuros (index.css) inverte as cores
    const { url, atribuicao, inverteNoEscuro } = mapasBase[base];
    camadaTiles.current = L.tileLayer(url, { attribution: atribuicao, maxZoom: 19, className: isDark && inverteNoEscuro ? "tiles-escuros" : undefined }).addTo(mapa.current);
    camadaTiles.current.bringToBack();
  }, [isDark, base]);

  useEffect(() => {
    const grupo = camadaObras.current;
    grupo.clearLayers();
    obras.forEach((obra) => {
      if (obra.caminho.length < 2) return;
      L.polyline(obra.caminho, { color: cores.primaria, weight: 14, opacity: 0.3, lineCap: "round", interactive: true })
        .bindTooltip(`<strong>Obra em garantia</strong><br/>Contrato ${escapar(obra.contrato)}<br/>${escapar(obra.descricao)}`, { sticky: true })
        .addTo(grupo);
    });
  }, [obras, cores]);

  useEffect(() => {
    const grupo = camadaSegmentos.current;
    grupo.clearLayers();
    const limites = L.latLngBounds([]);
    segmentos.forEach((segmento) => {
      if (segmento.caminho.length < 2) return;
      const cor = cores.condicao[segmento.condicao as Condicao] ?? cores.suave;
      const linha = L.polyline(segmento.caminho, { color: cor, weight: 4, opacity: 0.95, lineCap: "round", bubblingMouseEvents: false })
        .bindTooltip(
          `<strong>${escapar(segmento.rodovia)}</strong> · ${escapar(segmento.trecho)}<br/>km ${escapar(segmento.kmInicio)} a ${escapar(segmento.kmFim)}<br/>Condição: ${escapar(segmento.condicao || "–")}`,
          { sticky: true },
        )
        .on("click", () => aoClicarSegmentoAtual.current(segmento.id));
      linha.addTo(grupo);
      limites.extend(linha.getBounds());
    });
    limitesSegmentos.current = limites;
    const assinatura = `${segmentos.length}:${segmentos[0]?.id ?? ""}:${segmentos[segmentos.length - 1]?.id ?? ""}`;
    if (mapa.current && limites.isValid() && assinatura !== assinaturaEnquadrada.current) {
      assinaturaEnquadrada.current = assinatura;
      mapa.current.fitBounds(limites, { padding: [24, 24], maxZoom: 13, animate: !movimentoReduzido() });
    }
  }, [segmentos, cores]);

  useEffect(() => {
    const grupo = camadaSelecao.current;
    grupo.clearLayers();
    if (!selecionado) return;
    const limites = L.latLngBounds([]);
    segmentos
      .filter((segmento) => segmento.id === selecionado && segmento.caminho.length > 1)
      .forEach((segmento) => {
        // Anel azul por baixo e a cor da condição por cima: o trecho em foco continua legível
        L.polyline(segmento.caminho, { color: cores.primaria, weight: 12, opacity: 0.5, lineCap: "round", interactive: false }).addTo(grupo);
        const linha = L.polyline(segmento.caminho, { color: cores.condicao[segmento.condicao as Condicao] ?? cores.suave, weight: 5, opacity: 1, lineCap: "round", interactive: false }).addTo(grupo);
        limites.extend(linha.getBounds());
      });
    if (mapa.current && limites.isValid()) mapa.current.fitBounds(limites, { padding: [60, 60], maxZoom: 14, animate: !movimentoReduzido() });
  }, [selecionado, segmentos, cores]);

  useEffect(() => {
    const grupo = camadaFotos.current;
    grupo.clearLayers();
    fotos.forEach((foto) => {
      L.circleMarker(foto.ponto, { radius: 5, color: cores.primaria, weight: 2, fillColor: cores.superficie, fillOpacity: 1, bubblingMouseEvents: false })
        .bindTooltip(`Foto · ${escapar(foto.rodovia)} · ${escapar(foto.data)}`, { direction: "top", offset: [0, -6] })
        .on("click", () => aoClicarFotoAtual.current(foto.id))
        .addTo(grupo);
    });
  }, [fotos, cores]);

  useEffect(() => {
    if (!verLimites) return;
    let ativo = true;
    let camada: L.GeoJSON | null = null;
    carregarLimites()
      .then(({ malha, nomes }) => {
        if (!ativo || !mapa.current) return;
        camada = L.geoJSON(malha, {
          style: { color: cores.suave, weight: 1, opacity: 0.6 },
          onEachFeature: (municipio, linha) => {
            const codigo = String(municipio.properties?.codarea ?? "");
            linha.bindTooltip(escapar(nomes.get(codigo) ?? codigo), { sticky: true });
          },
        }).addTo(mapa.current);
        // Com preferCanvas, todas as linhas dividem um canvas e a ordem é a de inserção: os limites chegam depois
        // e cobririam os segmentos. bringToBack desenha por baixo, e o segmento ganha o hover onde os dois se cruzam.
        // (Um pane próprio não serve: o canvas do overlayPane fica por cima e engole os eventos do mouse)
        camada.bringToBack();
      })
      .catch(() => {
        if (!ativo) return;
        mostrarAviso("Não foi possível carregar os limites municipais", { tipo: "erro" });
        aoFalharLimitesAtual.current();
      });
    return () => {
      ativo = false;
      camada?.remove();
    };
  }, [verLimites, cores]);

  const centralizar = () => {
    if (mapa.current && limitesSegmentos.current.isValid()) mapa.current.fitBounds(limitesSegmentos.current, { padding: [24, 24], maxZoom: 13, animate: !movimentoReduzido() });
  };
  const filtrarArea = () => {
    if (!mapa.current) return;
    const b = mapa.current.getBounds();
    const ids = idsNaArea(segmentos, [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]]);
    // Tudo na tela: selecionar não mudaria nada e mandaria milhares de valores ao engine
    if (ids.length === 0) mostrarAviso("Nenhum segmento na área visível", { tipo: "erro" });
    else if (ids.length >= new Set(segmentos.filter((s) => s.caminho.length > 0).map((s) => s.id)).size) mostrarAviso("Todos os segmentos já estão na área visível", { tipo: "erro", descricao: "Aproxime o mapa para filtrar uma área menor." });
    else aoFiltrarArea(ids);
  };
  const exportarKml = () => baixarArquivo(gerarKml(segmentos, cores.condicao), "segmentos-icm.kml", "application/vnd.google-earth.kml+xml");

  const semSegmentos = segmentos.length === 0;
  // bg-sidebar é translúcido: sem o desfoque, o texto perde contraste sobre o satélite
  const estiloBotao = "h-8 border-input bg-sidebar backdrop-blur-custom text-foreground shadow-sm";

  return (
    <div className={cn("relative", className)}>
      <div
        ref={elemento}
        role="application"
        aria-label={`Mapa com ${segmentos.length.toLocaleString("pt-BR")} segmentos avaliados coloridos pela condição (${condicoes.join(", ")}), obras em garantia, fotos das vistorias${verLimites ? " e limites municipais" : ""}`}
        className="h-full w-full"
      />
      {/* Fora do contêiner do Leaflet: o clique nos botões não chega ao mapa. z acima dos painéis do Leaflet (até 1000) */}
      <div className="absolute right-2 top-2 z-[1000] flex flex-col items-end gap-1.5">
        <div role="group" aria-label="Mapa base" className="flex overflow-hidden rounded-md border border-input bg-sidebar shadow-sm backdrop-blur-custom">
          {(Object.keys(mapasBase) as MapaBase[]).map((chave) => (
            <button
              key={chave}
              type="button"
              aria-pressed={base === chave}
              onClick={() => setBase(chave)}
              className={cn(
                "h-8 cursor-pointer px-2.5 text-xs font-medium text-foreground transition-colors duration-(--duracao-curta) ease-(--ease-cor) hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50",
                base === chave && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {mapasBase[chave].rotulo}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" className={estiloBotao} onClick={filtrarArea} disabled={semSegmentos} aria-label="Filtrar área visível">
          <ScanSearch aria-hidden />
          <span className="hidden sm:inline">Filtrar área visível</span>
        </Button>
        <Button variant="outline" size="sm" className={estiloBotao} onClick={centralizar} disabled={semSegmentos} aria-label="Centralizar">
          <Crosshair aria-hidden />
          <span className="hidden sm:inline">Centralizar</span>
        </Button>
        <Button variant="outline" size="sm" className={estiloBotao} onClick={exportarKml} disabled={semSegmentos} aria-label="Exportar KML">
          <Download aria-hidden />
          <span className="hidden sm:inline">Exportar KML</span>
        </Button>
      </div>
    </div>
  );
};
