import type { ReactElement } from "react";
import { ChartLine, LayoutGrid, Map, Table2 } from "lucide-react";
import { VisaoGeral } from "@/pages/VisaoGeral/VisaoGeral";
import { MapaFotos } from "@/pages/MapaFotos/MapaFotos";
import { Indicadores } from "@/pages/Indicadores/Indicadores";
import { Trechos } from "@/pages/Trechos/Trechos";

export interface RouteDefinition {
  label: string;
  href: string;
  element: ReactElement;
  icon?: ReactElement;
  description?: string;
}

// Uma pergunta por página; os filtros valem para todas
export const routesDefinition: RouteDefinition[] = [
  {
    label: "Visão geral",
    href: "/visao-geral",
    description: "Onde a malha está pior e por quê: condição dos segmentos avaliados e média de cada problema por rodovia.",
    element: <VisaoGeral />,
    icon: <LayoutGrid size={16} />,
  },
  {
    label: "Mapa e fotos",
    href: "/mapa",
    description: "Onde ficam os trechos avaliados, como está cada um e as fotos da vistoria.",
    element: <MapaFotos />,
    icon: <Map size={16} />,
  },
  {
    label: "Indicadores",
    href: "/indicadores",
    description: "Quanto cada problema pesa na malha, mês a mês, e em quais rodovias ele é maior.",
    element: <Indicadores />,
    icon: <ChartLine size={16} />,
  },
  {
    label: "Trechos avaliados",
    href: "/trechos",
    description: "Lista completa das avaliações por segmento, com a resposta de cada problema.",
    element: <Trechos />,
    icon: <Table2 size={16} />,
  },
];
