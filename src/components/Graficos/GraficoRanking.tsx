import { useMemo } from "react";
import ReactECharts from "echarts-for-react/esm/core";
import { baseGrafico, echarts, eixoCategorias, eixoValores, EstadoGrafico, useClicarCategoria, useCoresGrafico } from "./base";
import { useCuboPaginado, numero } from "@/shared/hooks/useCuboPaginado";
import { useSelecionarValor } from "@/shared/hooks/useSelecionarValor";
import { escapar, faixaDaMedia, leituraFaixa, mediaQuestao, setTipo, type Questao } from "@/shared/qlik/icm";

/** Rodovias com a maior média da questão, da pior para a melhor; a barra leva a cor da faixa. Clicar seleciona a rodovia. */
export const GraficoRanking = ({ questao, limite = 15 }: { questao: Questao; limite?: number }) => {
  const cores = useCoresGrafico();
  const selecionar = useSelecionarValor();
  const { linhas, total, carregando } = useCuboPaginado({
    dimensoes: ["Rodovia"],
    medidas: [{ expressao: mediaQuestao(questao, setTipo(questao.tipo)), decrescente: true }],
    ordem: [1, 0],
    maxLinhas: limite,
    suprimirZero: true,
  });

  // ECharts desenha a primeira categoria embaixo: inverte para a pior ficar no topo
  const rodovias = useMemo(
    () =>
      (linhas ?? [])
        .map(([rodovia, media]) => ({ rodovia: rodovia?.qText ?? "", valor: numero(media) ?? 0 }))
        .reverse(),
    [linhas],
  );
  const aoIniciar = useClicarCategoria((indice) => {
    const rodovia = rodovias[indice]?.rodovia;
    if (rodovia) void selecionar("Rodovia", rodovia);
  });

  const opcao = useMemo(
    () => ({
      ...baseGrafico(cores),
      grid: { ...baseGrafico(cores).grid, right: 40, top: 8, bottom: 4 },
      tooltip: {
        ...baseGrafico(cores).tooltip,
        axisPointer: { type: "shadow", shadowStyle: { color: cores.borda, opacity: 0.4 } },
        formatter: (params: { dataIndex: number }[]) => {
          const r = rodovias[params[0]?.dataIndex ?? 0];
          return r ? `<strong>${escapar(r.rodovia)}</strong><br/>${questao.rotulo}: média ${r.valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}<br/>${leituraFaixa(r.valor, questao)}` : "";
        },
      },
      xAxis: { ...eixoValores(cores), min: 0, max: questao.alto },
      yAxis: { ...eixoCategorias(cores, rodovias.map((r) => r.rodovia)), axisLabel: { color: cores.texto, fontSize: 11 } },
      series: [
        {
          name: questao.rotulo,
          type: "bar",
          data: rodovias.map((r) => ({ value: r.valor, itemStyle: { color: cores.faixa[faixaDaMedia(r.valor, questao)] } })),
          barMaxWidth: 18,
          itemStyle: { borderRadius: [0, 3, 3, 0] },
          label: {
            show: true,
            position: "right",
            color: cores.texto,
            fontSize: 10,
            formatter: ({ value }: { value: number }) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
          },
        },
      ],
    }),
    [cores, rodovias, questao],
  );

  if (!linhas || rodovias.length === 0) return <EstadoGrafico carregando={carregando} />;
  return (
    <div className="flex h-full w-full flex-col">
      <div role="img" aria-label={`Gráfico de barras: as ${rodovias.length} rodovias com maior média de ${questao.rotulo}`} className="min-h-0 flex-1">
        <ReactECharts echarts={echarts} option={opcao} notMerge style={{ height: "100%", width: "100%" }} onChartReady={aoIniciar} />
      </div>
      {/* Sempre presente: o canvas mede a altura uma vez e a nota não pode entrar depois por cima do eixo */}
      <p className="min-h-4 shrink-0 px-2 pb-1 text-[11px] text-muted-foreground">{total > limite ? `As ${limite} piores de ${total.toLocaleString("pt-BR")} rodovias nos filtros atuais.` : ""}</p>
    </div>
  );
};
