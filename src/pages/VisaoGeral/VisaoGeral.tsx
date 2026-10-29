import { useMemo, useState } from "react";
import { useGenericKPI, type Cell, type KPIParams } from "@cluster-data-experience/qlik-modules";
import { Cartao, TabelaCartao } from "@/components/CartaoPainel/CartaoPainel";
import { medidaDecrescente, type ColunaTabela } from "@/components/CartaoPainel/colunas";
import { BarraCondicao, CelulaFaixa, ChipFaixa, corCondicao, LegendaCondicao, LegendaFaixa } from "@/components/Escala/Escala";
import { GraficoKmMes } from "@/components/Graficos/GraficoKmMes";
import { KpisIcm } from "@/components/KpisIcm/KpisIcm";
import { Skeleton } from "@/components/shadcn/skeleton";
import Tabs from "@/components/Tabs/Tabs";
import { useCuboPaginado, numero } from "@/shared/hooks/useCuboPaginado";
import { useMobileScreen } from "@/shared/hooks/useMobileScreen";
import { useSelecionarValor } from "@/shared/hooks/useSelecionarValor";
import { cn } from "@/shared/utils/tailwind/cn";
import {
  abasTipo,
  condicoes,
  faixaDaMedia,
  formatarKm,
  kmAvaliado,
  lerParcelas,
  mediaQuestao,
  parcelasCondicao,
  questoes,
  questoesDoTipo,
  rotuloFaixa,
  setCondicao,
  setTipo,
  type TipoSegmento,
} from "@/shared/qlik/icm";

// No celular a matriz vira lista: a questão que mais se aproxima da nota máxima, como "id|média"
// O texto é "id|média"; o número é o km em Ruim ou Péssimo, para a lista compacta continuar ordenada por ele
const piorProblema = (tipo: TipoSegmento) => {
  const lista = questoesDoTipo(tipo);
  const medias = lista.map((questao) => mediaQuestao(questao, setTipo(tipo)));
  const razoes = lista.map((questao, i) => `(${medias[i]} / ${questao.alto})`);
  const maior = `RangeMax(${razoes.join(", ")})`;
  const texto = lista.reduceRight<string>(
    (resto, questao, i) => `If(${razoes[i]} >= ${maior}, '${questao.id}|' & ${medias[i]}${resto ? `, ${resto}` : ""})`,
    "",
  );
  return `Dual(${texto}, ${kmAvaliado(setCondicao(["Ruim", "Péssimo"]), setTipo(tipo))})`;
};

const celulaPiorProblema = (celula: Cell) => {
  const [id, media] = (celula?.qText ?? "").split("|");
  const questao = questoes.find((q) => String(q.id) === id);
  const valor = parseFloat((media ?? "").replace(",", "."));
  if (!questao || !Number.isFinite(valor)) return <span className="text-muted-foreground">–</span>;
  const faixa = faixaDaMedia(valor, questao);
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="min-w-0 truncate text-[11px] leading-4">{questao.rotulo}</span>
      <ChipFaixa faixa={faixa} rotulo={`${rotuloFaixa[faixa]} · ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`} />
    </span>
  );
};

// A lib copia sortingPriority de cada coluna, na ordem do engine, para qInterColumnSortOrder: o valor da coluna i é o índice
// da i-ésima chave de ordenação. Engine: Rodovia 0, Condição 1, Km Ruim 2, Km avaliados 3, problemas 4+.
// Ordem desejada: km em Ruim ou Péssimo (2), rodovia (0), km avaliados (3), condição (1), problemas (4+)
const colunasMatriz = (tipo: TipoSegmento, compacta: boolean): ColunaTabela[] => {
  const t = setTipo(tipo);
  const colunas: ColunaTabela[] = [
    { type: "dimension", qFieldDefs: ["Rodovia"], qFieldLabels: ["Rodovia"], qNullSuppression: true, sortingPriority: 2, largura: compacta ? 76 : 90 },
    {
      type: "measure",
      qDef: parcelasCondicao(t),
      qLabel: "Condição",
      sortingPriority: 0,
      largura: compacta ? 96 : 132,
      descricao: "Parcela da extensão avaliada da rodovia em cada condição (Bom, Regular, Ruim, Péssimo) e o percentual em Bom",
      renderizar: (celula) => {
        const parcelas = lerParcelas(celula?.qText);
        const total = parcelas.reduce((soma, p) => soma + p, 0);
        return (
          <span className="flex items-center gap-2">
            <BarraCondicao parcelas={parcelas} titulo="Parcela da extensão em cada condição" className="h-2.5 min-w-0 flex-1" />
            {/* No celular a coluna fica só com a barra: o % Bom entra na dica */}
            {!compacta && (
              <span className={cn("w-9 shrink-0 text-right text-[11px] tabular-nums", corCondicao.Bom)} title="Parcela em condição Bom">
                {total ? `${Math.round((parcelas[0] / total) * 100)}%` : "–"}
              </span>
            )}
          </span>
        );
      },
    },
  ];
  // No celular: Rodovia · barra · pior problema (ordenada pelo km em Ruim ou Péssimo embutido na medida)
  if (compacta) {
    colunas.push({
      type: "measure",
      qDef: piorProblema(tipo),
      qLabel: "Pior problema",
      descricao: "O problema cuja média mais se aproxima da nota máxima; a lista vem ordenada pelos km em Ruim ou Péssimo",
      qSortBy: { qSortByNumeric: medidaDecrescente },
      sortingPriority: 1,
      largura: "resto",
      renderizar: celulaPiorProblema,
    });
    return colunas;
  }
  colunas.push(
    {
      type: "measure",
      qDef: `Num(${kmAvaliado(setCondicao(["Ruim", "Péssimo"]), t)}, '#.##0')`,
      qLabel: "Km Ruim/Péssimo",
      descricao: "Extensão avaliada da rodovia em condição Ruim ou Péssimo; a tabela vem ordenada por esta coluna",
      qSortBy: { qSortByNumeric: medidaDecrescente },
      sortingPriority: 3,
      largura: 150,
      renderizar: (celula) => <span className="font-semibold tabular-nums">{celula?.qText ?? "–"}</span>,
    },
    { type: "measure", qDef: `Num(${kmAvaliado(t)}, '#.##0')`, qLabel: "Km avaliados", descricao: "Extensão avaliada da rodovia no período, nos filtros atuais", sortingPriority: 1, largura: 104 },
  );
  questoesDoTipo(tipo).forEach((questao, i) => {
    colunas.push({
      type: "measure",
      qDef: `Num(${mediaQuestao(questao, t)}, '#.##0,0')`,
      qLabel: questao.rotulo,
      descricao: `${questao.rotulo}: média da nota (0 = nenhuma ocorrência). Baixo até ${questao.baixo.toLocaleString("pt-BR")}, Médio até ${questao.medio.toLocaleString("pt-BR")}, Alto acima disso (máximo ${questao.alto.toLocaleString("pt-BR")})`,
      sortingPriority: 4 + i,
      // O rótulo inteiro cabe com a seta de ordenação; nomes longos do não pavimentado alargam a coluna
      largura: Math.max(84, Math.round(questao.rotulo.length * 7) + 18),
      renderizar: (celula) => <CelulaFaixa valor={numero(celula)} texto={celula?.qText} questao={questao} />,
    });
  });
  return colunas;
};

// Erro do Qlik: sem isto o cartão pulsaria no esqueleto para sempre (mesmo texto do KpisIcm)
const IndicadorIndisponivel = () => <p className="animate-esmaecer text-xs text-muted-foreground">Indicador indisponível no momento.</p>;

const kpisCondicao: KPIParams[] = condicoes.map((condicao) => ({ label: condicao, expression: `Num(${kmAvaliado(setCondicao([condicao]))}, '#.##0')` }));

/** Barra grande Bom→Péssimo com os km de cada condição; clicar numa faixa filtra a condição */
const DistribuicaoCondicao = () => {
  const { data, error } = useGenericKPI(kpisCondicao);
  const selecionar = useSelecionarValor();
  const kms = condicoes.map((_, i) => numero(data?.[i]) ?? 0);
  const total = kms.reduce((soma, km) => soma + km, 0);
  if (!data) return error ? <IndicadorIndisponivel /> : <Skeleton className="h-20 w-full rounded-lg bg-muted" />;
  const aoClicar = (condicao: string) => void selecionar("Avaliação condição do segmento", condicao);
  return (
    <div className="animate-esmaecer flex flex-col gap-3">
      <BarraCondicao parcelas={kms} grande aoClicar={aoClicar} titulo="Parcela da extensão avaliada em cada condição" />
      <LegendaCondicao
        empilhada
        aoClicar={aoClicar}
        valores={Object.fromEntries(
          condicoes.map((condicao, i) => [condicao, `${formatarKm(kms[i])} · ${total ? Math.round((kms[i] / total) * 100) : 0}%`]),
        )}
      />
      <p className="text-[11px] text-muted-foreground">Clique numa faixa para ver só os segmentos daquela condição.</p>
    </div>
  );
};

/** Quantos avaliadores vistoriaram no período e os três que mais percorreram */
const Avaliadores = () => {
  const { data, error } = useGenericKPI([{ label: "Avaliadores", expression: "Count(distinct Avaliador)" }]);
  const { linhas } = useCuboPaginado({ dimensoes: ["Avaliador"], medidas: [{ expressao: kmAvaliado(), decrescente: true }], ordem: [1, 0], maxLinhas: 3, suprimirZero: true });
  const selecionar = useSelecionarValor();
  if (!data || !linhas) return error ? <IndicadorIndisponivel /> : <Skeleton className="h-20 w-full rounded-lg bg-muted" />;
  return (
    <div className="animate-esmaecer flex flex-col gap-2 text-xs">
      <p className="text-foreground">
        <span className="text-base font-semibold tabular-nums">{data[0]?.qText ?? "–"}</span> avaliadores no período
      </p>
      <ol className="flex flex-col divide-y divide-border">
        {linhas.map(([nome, km]) => (
          <li key={nome?.qText}>
            <button
              type="button"
              onClick={() => nome?.qText && void selecionar("Avaliador", nome.qText)}
              title={`Filtrar pelo avaliador ${nome?.qText}`}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm py-1.5 text-left transicao-feedback hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="min-w-0 truncate">{nome?.qText}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{formatarKm(numero(km) ?? 0)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const VisaoGeral = () => {
  const [tipo, setTipo_] = useState<TipoSegmento>("Pavimentado");
  const compacta = useMobileScreen(1024);
  const colunas = useMemo(() => colunasMatriz(tipo, compacta), [tipo, compacta]);
  const referencias = questoesDoTipo(tipo)
    .map((q) => `${q.rotulo} ${q.baixo.toLocaleString("pt-BR")}/${q.medio.toLocaleString("pt-BR")}`)
    .join(" · ");

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto lg:overflow-hidden">
      <KpisIcm />
      <div className="grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,7fr)_minmax(0,2fr)]">
        <Cartao
          titulo="Condição e problemas por rodovia"
          className="h-[560px] shrink-0 lg:h-auto lg:min-h-0"
          acoes={<Tabs tabs={abasTipo} activeTab={tipo} onTabChange={(valor) => setTipo_(valor as TipoSegmento)} className="w-auto shrink-0" />}
        >
          {(slot) => (
            <div className="flex h-full min-h-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
                <span>
                  Rodovias com mais km em Ruim ou Péssimo primeiro. Cada célula é a média da nota do problema; a cor diz a faixa.
                </span>
                <LegendaFaixa />
                <span title="Até o primeiro valor é Baixo; até o segundo, Médio; acima, Alto">Limites Baixo/Médio: {referencias}</span>
              </div>
              <div className="min-h-0 flex-1">
                <TabelaCartao
                  // key: o conjunto de colunas muda com o tipo e a largura e o cubo precisa ser recriado
                  key={`${tipo}-${compacta ? "compacta" : "completa"}`}
                  colunas={colunas}
                  slotExportar={slot}
                  nomeArquivo={`condicao-por-rodovia-${tipo === "Pavimentado" ? "pavimentado" : "nao-pavimentado"}`}
                  linhasIniciais={100}
                  selecionarLinha
                  // Sem a lupa no cabeçalho: a barra de filtros já tem Rodovia e o rótulo cabe inteiro
                  filtroNoCabecalho={false}
                  // Rodovias sem km do tipo escolhido ficam com todas as medidas nulas e saem
                  hipercubo={{ qSuppressZero: true }}
                  className={compacta ? "[&_td]:h-11 [&_th]:h-11" : "[&_td]:h-9 [&_th]:h-9"}
                />
              </div>
            </div>
          )}
        </Cartao>

        <aside aria-label="Resumo do período" className="flex flex-col gap-2 max-lg:order-first lg:min-h-0 lg:overflow-y-auto">
          <Cartao titulo="Condição dos segmentos avaliados" className="h-auto shrink-0">
            {() => <DistribuicaoCondicao />}
          </Cartao>
          {/* No desktop o gráfico ocupa a sobra da coluna, para ela terminar alinhada com a tabela */}
          <Cartao titulo="Extensão avaliada por mês" className="h-[240px] shrink-0 lg:h-auto lg:min-h-[200px] lg:flex-1">
            {() => <GraficoKmMes />}
          </Cartao>
          <Cartao titulo="Avaliadores" className="h-auto shrink-0">
            {() => <Avaliadores />}
          </Cartao>
        </aside>
      </div>
    </div>
  );
};
