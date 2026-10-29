import { useMemo } from "react";
import ReactECharts from "echarts-for-react/esm/core";
import { baseGrafico, echarts, eixoCategorias, eixoValores, EstadoGrafico, useClicarCategoria, useCoresGrafico } from "./base";
import { useCuboPaginado, numero } from "@/shared/hooks/useCuboPaginado";
import { useSelecionarValor } from "@/shared/hooks/useSelecionarValor";
import { escapar, faixaDaMedia, leituraFaixa, mediaQuestao, mesesSemFiltro, rotuloFaixa, setTipo, type Questao } from "@/shared/qlik/icm";

/** Média da questão por mês (todos os meses: quatro não dizem se está melhorando), com as três referências. Clicar num mês seleciona o ano/mês no Qlik. */
export const GraficoTendencia = ({ questao }: { questao: Questao }) => {
  const cores = useCoresGrafico();
  const selecionar = useSelecionarValor();
  const { linhas, carregando } = useCuboPaginado({
    dimensoes: [{ campo: "Ano/Mês", ordenarPor: "expressao", expressaoOrdem: "Only(NUANOMES)" }],
    medidas: [mediaQuestao(questao, setTipo(questao.tipo), mesesSemFiltro), mediaQuestao(questao, setTipo(questao.tipo))],
    maxLinhas: 120,
  });

  const pontos = useMemo(
    () =>
      (linhas ?? []).map(([mes, media, noPeriodo]) => ({
        mes: mes?.qText ?? "",
        valor: numero(media),
        emContexto: numero(noPeriodo) !== null,
      })),
    [linhas],
  );
  const aoIniciar = useClicarCategoria((indice) => {
    const mes = pontos[indice]?.mes;
    if (mes) void selecionar("Ano/Mês", mes, true);
  });

  const referencias = [
    { rotulo: "Alto", valor: questao.alto, cor: cores.faixa.alto },
    { rotulo: "Médio", valor: questao.medio, cor: cores.faixa.medio },
    { rotulo: "Baixo", valor: questao.baixo, cor: cores.faixa.baixo },
  ];

  const opcao = useMemo(
    () => ({
      ...baseGrafico(cores),
      tooltip: {
        ...baseGrafico(cores).tooltip,
        axisPointer: { type: "line", lineStyle: { color: cores.suave } },
        formatter: (params: { dataIndex: number }[]) => {
          const ponto = pontos[params[0]?.dataIndex ?? 0];
          if (!ponto || ponto.valor === null) return "";
          return `<strong>${escapar(ponto.mes)}</strong><br/>${questao.rotulo}: média ${ponto.valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}<br/>${leituraFaixa(ponto.valor, questao)}`;
        },
      },
      xAxis: { ...eixoCategorias(cores, pontos.map((p) => p.mes)), boundaryGap: false, axisLabel: { color: cores.suave, fontSize: 10, interval: Math.max(0, Math.ceil(pontos.length / 8) - 1) } },
      yAxis: { ...eixoValores(cores), min: 0, max: questao.alto },
      series: [
        {
          name: questao.rotulo,
          type: "line",
          data: pontos.map((p) => ({
            value: p.valor,
            // O ponto leva a cor da faixa em que o mês caiu; vazado fora do período em contexto
            itemStyle: {
              color: p.valor === null ? cores.suave : p.emContexto ? cores.faixa[faixaDaMedia(p.valor, questao)] : cores.superficie,
              borderColor: p.valor === null ? cores.suave : cores.faixa[faixaDaMedia(p.valor, questao)],
              borderWidth: 2,
            },
          })),
          lineStyle: { width: 2, color: cores.primaria },
          symbol: "circle",
          symbolSize: 9,
          connectNulls: true,
          markLine: {
            silent: true,
            symbol: "none",
            // Referência fixa: não anima a partir da posição da série anterior ao trocar tema ou filtro
            animation: false,
            data: referencias.map(({ valor, rotulo, cor }) => ({
              yAxis: valor,
              lineStyle: { color: cor, type: [6, 4], width: 1.5, opacity: 1 },
              label: { formatter: `${rotulo} ${valor.toLocaleString("pt-BR")}`, position: "end", color: cor, fontSize: 10, fontWeight: 500 },
            })),
          },
        },
      ],
    }),
    // referencias deriva de questao e cores
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cores, pontos, questao],
  );

  if (!linhas || pontos.length === 0) return <EstadoGrafico carregando={carregando} />;
  return (
    <div
      role="img"
      aria-label={`Gráfico de linha: média de ${questao.rotulo} por mês, com as referências ${rotuloFaixa.alto} ${questao.alto.toLocaleString("pt-BR")}, ${rotuloFaixa.medio} ${questao.medio.toLocaleString("pt-BR")} e ${rotuloFaixa.baixo} ${questao.baixo.toLocaleString("pt-BR")}`}
      className="h-full w-full"
    >
      <ReactECharts echarts={echarts} option={opcao} notMerge style={{ height: "100%", width: "100%" }} onChartReady={aoIniciar} />
    </div>
  );
};
