import { useMemo } from "react";
import ReactECharts from "echarts-for-react/esm/core";
import { baseGrafico, echarts, eixoCategorias, eixoValores, EstadoGrafico, useClicarCategoria, useCoresGrafico } from "./base";
import { useCuboPaginado, numero } from "@/shared/hooks/useCuboPaginado";
import { useSelecionarValor } from "@/shared/hooks/useSelecionarValor";
import { escapar, kmAvaliado, mesesSemFiltro } from "@/shared/qlik/icm";

/** Extensão (km) avaliada por mês. Clicar num mês seleciona o ano/mês no Qlik. */
export const GraficoKmMes = () => {
  const cores = useCoresGrafico();
  const selecionar = useSelecionarValor();
  const { linhas, carregando } = useCuboPaginado({
    dimensoes: [{ campo: "Ano/Mês", ordenarPor: "expressao", expressaoOrdem: "Only(NUANOMES)" }],
    medidas: [kmAvaliado(mesesSemFiltro), kmAvaliado()],
    maxLinhas: 120,
  });

  const meses = useMemo(
    () =>
      (linhas ?? []).map(([mes, total, noPeriodo]) => ({
        mes: mes?.qText ?? "",
        km: numero(total) ?? 0,
        emContexto: (numero(noPeriodo) ?? 0) > 0,
      })),
    [linhas],
  );
  const aoIniciar = useClicarCategoria((indice) => {
    const mes = meses[indice]?.mes;
    if (mes) void selecionar("Ano/Mês", mes, true);
  });

  const opcao = useMemo(
    () => ({
      ...baseGrafico(cores),
      grid: { ...baseGrafico(cores).grid, right: 8, top: 12 },
      tooltip: {
        ...baseGrafico(cores).tooltip,
        axisPointer: { type: "shadow", shadowStyle: { color: cores.borda, opacity: 0.4 } },
        formatter: (params: { dataIndex: number }[]) => {
          const mes = meses[params[0]?.dataIndex ?? 0];
          return `<strong>${escapar(mes?.mes ?? "")}</strong><br/>${Math.round(mes?.km ?? 0).toLocaleString("pt-BR")} km avaliados${mes?.emContexto ? "<br/>no período em contexto" : ""}`;
        },
      },
      xAxis: { ...eixoCategorias(cores, meses.map((m) => m.mes)), axisLabel: { color: cores.suave, fontSize: 9, interval: Math.max(0, Math.ceil(meses.length / 4) - 1) } },
      yAxis: eixoValores(cores),
      series: [
        {
          name: "km",
          type: "bar",
          data: meses.map((m) => ({ value: m.km, itemStyle: { color: m.emContexto ? cores.primaria : cores.borda } })),
          barMaxWidth: 28,
          itemStyle: { borderRadius: [3, 3, 0, 0] },
        },
      ],
    }),
    [cores, meses],
  );

  if (!linhas || meses.length === 0) return <EstadoGrafico carregando={carregando} />;
  return (
    <div role="img" aria-label="Gráfico de barras: extensão avaliada por mês; os meses do período em contexto em azul" className="h-full w-full">
      <ReactECharts echarts={echarts} option={opcao} notMerge style={{ height: "100%", width: "100%" }} onChartReady={aoIniciar} />
    </div>
  );
};
