import { useGenericKPI, type KPIParams } from "@cluster-data-experience/qlik-modules";
import Card from "@/components/Card/components/Root/Root";
import { Variant1 } from "@/components/KPI/kpi-variant1";
import { corCondicao } from "@/components/Escala/Escala";
import { Skeleton } from "@/components/shadcn/skeleton";
import { kmAvaliado, setCondicao } from "@/shared/qlik/icm";
import { cn } from "@/shared/utils/tailwind/cn";

// Quatro números do período em contexto: quanto foi vistoriado e como está
const indicadores = [
  {
    rotulo: "Extensão avaliada",
    icone: "ellipse-layers",
    expressao: `Num(${kmAvaliado()}, '#.##0') & ' km'`,
    explicacao: "Soma da extensão dos segmentos vistoriados no período em contexto",
  },
  {
    rotulo: "Segmentos avaliados",
    icone: "ellipse-blocks",
    expressao: "Num(Count(distinct cdAvaliacaoSegmento), '#.##0')",
    explicacao: "Avaliações de segmento no período: um segmento vistoriado em dois meses conta duas vezes",
  },
  {
    rotulo: "Em condição Bom",
    icone: "ellipse-percent-diamond",
    // Interseção com o filtro de condição: com "Ruim" selecionado, o Bom é 0%, não 400%
    expressao: `Num(${kmAvaliado(setCondicao(["Bom"], true))} / ${kmAvaliado()}, '0%')`,
    cor: corCondicao.Bom,
    explicacao: "Parcela da extensão avaliada cujos segmentos estão em condição Bom",
  },
  {
    rotulo: "Ruim ou Péssimo",
    icone: "ellipse-percent-diamond",
    expressao: `Num(${kmAvaliado(setCondicao(["Ruim", "Péssimo"], true))} / ${kmAvaliado()}, '0%')`,
    cor: corCondicao.Ruim,
    explicacao: "Parcela da extensão avaliada cujos segmentos estão em condição Ruim ou Péssimo",
  },
] as const;

const kpis: KPIParams[] = indicadores.map(({ rotulo, expressao }) => ({ label: rotulo, expression: expressao }));

export const KpisIcm = () => {
  const { data, error } = useGenericKPI(kpis);

  return (
    <section aria-label="Indicadores do período" className="grid shrink-0 grid-cols-2 gap-2 xl:grid-cols-4">
      {indicadores.map(({ rotulo, icone, explicacao, ...resto }, indice) => {
        const celula = data?.[indice];
        // Com erro do Qlik o cartão mostra o travessão em vez de pulsar para sempre
        const valor = celula?.qText ?? "–";
        const cor = "cor" in resto ? resto.cor : undefined;
        return (
          <Card key={rotulo} className="px-4 py-3" title={!data && error ? "Indicador indisponível no momento" : explicacao}>
            {data || error ? (
              <Variant1
                icon={icone}
                title={rotulo}
                className="max-sm:[&>svg]:hidden"
                value={
                  // key pelo valor: ao filtrar, só o número que mudou assenta de novo
                  <span key={valor} className={cn("inline-block animate-entrar-chip", cor)}>
                    {valor}
                  </span>
                }
              />
            ) : (
              <Skeleton className="h-10 w-full rounded-lg bg-muted" />
            )}
            {/* O title só aparece com mouse; teclado e leitor de tela recebem a explicação aqui */}
            <span className="sr-only">{explicacao}</span>
          </Card>
        );
      })}
    </section>
  );
};
