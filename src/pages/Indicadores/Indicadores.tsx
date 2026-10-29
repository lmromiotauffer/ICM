import { useMemo, useState } from "react";
import { Cartao } from "@/components/CartaoPainel/CartaoPainel";
import { ChipFaixa } from "@/components/Escala/Escala";
import { GraficoRanking } from "@/components/Graficos/GraficoRanking";
import { GraficoTendencia } from "@/components/Graficos/GraficoTendencia";
import { Skeleton } from "@/components/shadcn/skeleton";
import Tabs from "@/components/Tabs/Tabs";
import { useCuboPaginado, numero } from "@/shared/hooks/useCuboPaginado";
import { abasTipo, faixaDaMedia, leituraFaixa, mediaQuestao, questoesDoTipo, setTipo, type Questao, type TipoSegmento } from "@/shared/qlik/icm";
import { cn } from "@/shared/utils/tailwind/cn";

const CartaoIndicador = ({ questao, valor, texto, ativo, ordem, aoEscolher }: { questao: Questao; valor: number | null; texto?: string; ativo: boolean; ordem: number; aoEscolher: () => void }) => {
  const faixa = valor === null ? null : faixaDaMedia(valor, questao);
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-pressed={ativo}
      data-ordem
      style={{ "--ordem": ordem } as React.CSSProperties}
      className={cn(
        "flex cursor-pointer flex-col gap-1.5 rounded-lg border border-input bg-sidebar p-3 text-left backdrop-blur-custom transition-[border-color,box-shadow,background-color,scale] duration-(--duracao-curta) ease-(--ease-cor) hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] active:duration-[80ms] motion-reduce:active:scale-100",
        ativo && "border-primary bg-accent shadow-sm ring-1 ring-primary",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium text-foreground" title={questao.rotulo}>{questao.rotulo}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">máx. {questao.alto.toLocaleString("pt-BR")}</span>
      </span>
      {valor === null ? (
        <span className="text-2xl font-semibold leading-none text-muted-foreground">–</span>
      ) : (
        <>
          <span className="flex items-center gap-2">
            {/* key pelo valor, como nos KPIs: ao filtrar, só a média que mudou assenta de novo */}
            <span key={texto ?? valor} className="animate-entrar-chip text-2xl font-semibold leading-none tabular-nums text-foreground">{texto ?? valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>
            <ChipFaixa faixa={faixa} />
          </span>
          <span className="text-[11px] text-muted-foreground">{leituraFaixa(valor, questao)}</span>
        </>
      )}
    </button>
  );
};

export const Indicadores = () => {
  const [tipo, setTipoAtual] = useState<TipoSegmento>("Pavimentado");
  const lista = useMemo(() => questoesDoTipo(tipo), [tipo]);
  const [escolhidaId, setEscolhidaId] = useState<number>(lista[0].id);
  const escolhida = lista.find((questao) => questao.id === escolhidaId) ?? lista[0];

  // Médias do período em contexto, uma por questão, numa linha só
  const { linhas } = useCuboPaginado({ dimensoes: [], medidas: lista.map((questao) => `Num(${mediaQuestao(questao, setTipo(tipo))}, '#.##0,0')`), maxLinhas: 1 });
  const medias = linhas?.[0];

  const trocarTipo = (valor: string) => {
    const novo = valor as TipoSegmento;
    setTipoAtual(novo);
    setEscolhidaId(questoesDoTipo(novo)[0].id);
  };

  const secoes = Array.from(new Set(lista.map((questao) => questao.secao)));

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">Quanto menor a média, melhor. Clique num indicador para ver a evolução mensal e as rodovias onde ele é maior.</p>
        <Tabs tabs={abasTipo} activeTab={tipo} onTabChange={trocarTipo} className="w-auto shrink-0" />
      </div>

      {/* Pavimentado: as duas seções lado a lado; não pavimentado: uma seção só, em largura cheia */}
      <div className={cn("grid shrink-0 gap-2", secoes.length > 1 && "xl:grid-cols-2")}>
        {secoes.map((secao) => (
          <section key={secao} aria-label={`Indicadores de ${secao.toLowerCase()}`} className="flex flex-col gap-1.5">
            {secoes.length > 1 && <h2 className="px-1 text-xs font-medium text-muted-foreground">{secao}</h2>}
            {/* Cartões chegam em cascata ao sair do esqueleto e ao trocar o tipo (keys novas) */}
            <div data-revelar="entrada" className={cn("grid grid-cols-2 gap-2 md:grid-cols-3", secoes.length === 1 && "xl:grid-cols-6")}>
              {lista
                .filter((questao) => questao.secao === secao)
                .map((questao, ordem) => {
                  const celula = medias?.[lista.indexOf(questao)];
                  return medias ? (
                    <CartaoIndicador
                      key={questao.id}
                      questao={questao}
                      valor={numero(celula)}
                      texto={celula?.qText}
                      ativo={questao.id === escolhida.id}
                      ordem={ordem}
                      aoEscolher={() => setEscolhidaId(questao.id)}
                    />
                  ) : (
                    <Skeleton key={questao.id} className="h-[88px] w-full rounded-lg bg-muted" />
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      <div className="grid shrink-0 gap-2 lg:min-h-[260px] lg:flex-1 lg:grid-cols-2">
        <Cartao titulo={`${escolhida.rotulo} · média por mês, todos os meses com vistoria`} className="h-[300px] lg:h-auto lg:min-h-0">
          {() => <GraficoTendencia key={escolhida.id} questao={escolhida} />}
        </Cartao>
        <Cartao titulo={`${escolhida.rotulo} · rodovias com maior média no período`} className="h-[420px] lg:h-auto lg:min-h-0">
          {() => <GraficoRanking key={escolhida.id} questao={escolhida} />}
        </Cartao>
      </div>
    </div>
  );
};
