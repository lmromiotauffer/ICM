import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Skeleton } from "@/components/shadcn/skeleton";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { movimentoReduzido } from "@/shared/hooks/useMovimentoReduzido";
import type { Condicao, Faixa } from "@/shared/qlik/icm";

// Só os módulos usados: o echarts completo pesa ~1 MB minificado
echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

// O canvas precisa de cores resolvidas: lê as paletas --palette-{light,dark}-* de index.css, que não dependem
// da classe do documento (a troca de tema não lê a cor anterior)
export const useCoresGrafico = () => {
  const { isDark } = useTheme();
  return useMemo(() => {
    const estilos = getComputedStyle(document.documentElement);
    const ler = (papel: string) => estilos.getPropertyValue(`--palette-${isDark ? "dark" : "light"}-${papel}`).trim();
    return {
      superficie: ler("surface"),
      texto: ler("text"),
      suave: ler("muted"),
      borda: ler("border"),
      primaria: ler("primary"),
      faixa: { baixo: ler("success"), medio: ler("alerta"), alto: ler("destructive") } as Record<Faixa, string>,
      condicao: { Bom: ler("success"), Regular: ler("alerta"), Ruim: ler("destructive"), Péssimo: ler("pessimo") } as Record<Condicao, string>,
      fonte: getComputedStyle(document.body).fontFamily,
    };
  }, [isDark]);
};

export type Cores = ReturnType<typeof useCoresGrafico>;

export const baseGrafico = (cores: Cores) => ({
  backgroundColor: "transparent",
  // A animação do ECharts é JS e escapa do CSS de movimento reduzido
  animation: !movimentoReduzido(),
  // No vocabulário do index.css: entrada de painel um pouco mais longa (o gráfico remonta ao trocar o indicador),
  // atualização de filtro em --duracao-longa; quinticOut é a curva do --ease-suave
  animationDuration: 600,
  animationEasing: "quinticOut",
  animationDurationUpdate: 400,
  animationEasingUpdate: "quinticOut",
  textStyle: { fontFamily: cores.fonte },
  // ECharts 6: outerBoundsMode "same" + outerBoundsContain "axisLabel" é o containLabel: true de antes (depreciado)
  grid: { left: 8, right: 56, top: 24, bottom: 8, outerBoundsMode: "same", outerBoundsContain: "axisLabel" },
  tooltip: {
    trigger: "axis",
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    textStyle: { color: cores.texto, fontSize: 12 },
  },
});

export const eixoCategorias = (cores: Cores, dados: string[]) => ({
  type: "category",
  data: dados,
  axisLabel: { color: cores.suave, fontSize: 10 },
  axisLine: { lineStyle: { color: cores.borda } },
  axisTick: { show: false },
});

export const eixoValores = (cores: Cores) => ({
  type: "value",
  // Milhar com ponto, como o resto do painel (o ECharts usa vírgula por padrão)
  axisLabel: { color: cores.suave, fontSize: 10, formatter: (valor: number) => valor.toLocaleString("pt-BR") },
  splitLine: { lineStyle: { color: cores.borda } },
});

// A faixa inteira da categoria seleciona, não só a marca: a barra fina e o ponto de 8px são alvos pequenos
export const useClicarCategoria = (selecionar: (indice: number) => void) => {
  const selecionarAtual = useRef(selecionar);
  useEffect(() => {
    selecionarAtual.current = selecionar;
  });
  return (grafico: echarts.EChartsType) => {
    grafico.getZr().on("click", ({ offsetX, offsetY }) => {
      if (!grafico.containPixel("grid", [offsetX, offsetY])) return;
      const [x, y] = grafico.convertFromPixel({ seriesIndex: 0 }, [offsetX, offsetY]) as number[];
      // Em barras horizontais a categoria está no eixo y
      const opcao = grafico.getOption() as { yAxis?: { type?: string }[] };
      const indice = opcao.yAxis?.[0]?.type === "category" ? y : x;
      selecionarAtual.current(Math.round(indice));
    });
  };
};

export const EstadoGrafico = ({ carregando }: { carregando: boolean }) =>
  carregando ? (
    <Skeleton className="h-full w-full rounded-lg bg-muted" />
  ) : (
    <p className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem dados para os filtros atuais.</p>
  );

export { echarts };
