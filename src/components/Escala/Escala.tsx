import type { ReactNode } from "react";
import { Badge } from "@/components/shadcn/badge";
import { cn } from "@/shared/utils/tailwind/cn";
import {
  condicoes,
  faixaDaMedia,
  leituraFaixa,
  lerParcelas,
  normalizarResposta,
  rotuloFaixa,
  type Condicao,
  type Faixa,
  type Questao,
} from "@/shared/qlik/icm";

// Uma escala só de cor em todo o painel: condição do segmento (cheia) e nível do problema (tingida)

export const fundoCondicao: Record<Condicao, string> = {
  Bom: "bg-n-success text-n-success-foreground",
  Regular: "bg-n-alerta text-n-alerta-foreground",
  Ruim: "bg-destructive text-destructive-foreground",
  Péssimo: "bg-n-pessimo text-n-pessimo-foreground",
};

export const corCondicao: Record<Condicao, string> = {
  Bom: "text-n-success",
  Regular: "text-n-alerta",
  Ruim: "text-destructive",
  Péssimo: "text-n-pessimo",
};

export const corFaixa: Record<Faixa | "nenhuma", string> = {
  baixo: "text-n-success",
  medio: "text-n-alerta",
  alto: "text-destructive",
  nenhuma: "text-muted-foreground",
};

/** Condição do segmento como selo tingido (Bom, Regular, Ruim, Péssimo): status não preenche, como no resto do sistema */
export const ChipCondicao = ({ condicao, className }: { condicao: string; className?: string }) => {
  const conhecida = condicoes.includes(condicao as Condicao) ? (condicao as Condicao) : null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 whitespace-nowrap border-transparent px-2 py-0 text-[11px] font-medium leading-4",
        conhecida ? cn(corCondicao[conhecida], "bg-current/10") : "bg-muted text-foreground",
        className,
      )}
    >
      {condicao || "–"}
    </Badge>
  );
};

/** Nível do problema como selo tingido; "Nenhuma ocorrência" fica neutro e "-" do engine vira "–" */
export const ChipFaixa = ({ faixa, rotulo, className }: { faixa: Faixa | "nenhuma" | null; rotulo?: string; className?: string }) => {
  if (!faixa) return <span className="text-muted-foreground">–</span>;
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 whitespace-nowrap border-transparent px-2 py-0 text-[11px] font-medium leading-4",
        corFaixa[faixa],
        faixa === "nenhuma" ? "bg-muted" : "bg-current/10",
        className,
      )}
    >
      {rotulo ?? (faixa === "nenhuma" ? "Nenhuma" : rotuloFaixa[faixa])}
    </Badge>
  );
};

/** Resposta do app (Alta/Médio/Bom/…) normalizada para a faixa do painel */
export const ChipResposta = ({ resposta }: { resposta?: string }) => <ChipFaixa faixa={normalizarResposta(resposta)} />;

/** Célula da matriz: a média com o fundo tingido pela faixa em que cai */
export const CelulaFaixa = ({ valor, texto, questao }: { valor: number | null; texto?: string; questao: Questao }) => {
  if (valor === null) return <span className="block text-right text-muted-foreground">–</span>;
  const faixa = faixaDaMedia(valor, questao);
  return (
    <span
      className={cn("flex h-7 items-center justify-end rounded-sm bg-current/18 px-2 font-semibold tabular-nums", corFaixa[faixa])}
      title={`${questao.rotulo}: média ${texto ?? valor.toLocaleString("pt-BR")} (${leituraFaixa(valor, questao)})`}
    >
      {texto ?? valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
    </span>
  );
};

type BarraProps = {
  // Parcelas de 0 a 1 na ordem Bom, Regular, Ruim, Péssimo (ou o texto "a|b|c|d" do engine)
  parcelas: number[] | string;
  grande?: boolean;
  className?: string;
  // Com clique, cada faixa vira um alvo (ex.: selecionar a condição no Qlik)
  aoClicar?: (condicao: Condicao) => void;
  titulo?: string;
};

/** Barra empilhada Bom→Péssimo: a mesma barra aparece no KPI, em cada rodovia e no mapa */
export const BarraCondicao = ({ parcelas, grande, className, aoClicar, titulo }: BarraProps) => {
  const valores = typeof parcelas === "string" ? lerParcelas(parcelas) : parcelas;
  const total = valores.reduce((soma, v) => soma + (Number.isFinite(v) ? v : 0), 0);
  if (!total) return <span className={cn("block h-1.5 rounded-full bg-muted", grande && "h-9", className)} aria-hidden />;
  const descricao = condicoes.map((c, i) => `${c} ${Math.round(((valores[i] ?? 0) / total) * 100)}%`).join(", ");
  return (
    <span
      role={aoClicar ? "group" : "img"}
      aria-label={titulo ? `${titulo}: ${descricao}` : descricao}
      title={aoClicar ? undefined : descricao}
      className={cn("flex w-full overflow-hidden rounded-full bg-muted", grande ? "h-9 rounded-md" : "h-1.5", className)}
    >
      {condicoes.map((condicao, i) => {
        const parcela = (valores[i] ?? 0) / total;
        if (parcela <= 0) return null;
        const largura = `${parcela * 100}%`;
        const rotulo = `${condicao} ${Math.round(parcela * 100)}%`;
        const Tag = aoClicar ? "button" : "span";
        return (
          <Tag
            key={condicao}
            type={aoClicar ? "button" : undefined}
            onClick={aoClicar ? () => aoClicar(condicao) : undefined}
            title={rotulo}
            aria-label={aoClicar ? `Filtrar condição ${condicao} (${Math.round(parcela * 100)}%)` : undefined}
            style={{ width: largura }}
            className={cn(
              "flex h-full items-center justify-center overflow-hidden text-[11px] font-semibold whitespace-nowrap",
              fundoCondicao[condicao],
              aoClicar && "cursor-pointer transition-[filter] duration-(--duracao-curta) ease-(--ease-cor) hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            )}
          >
            {grande && parcela >= 0.2 && <span className="px-1">{rotulo}</span>}
          </Tag>
        );
      })}
    </span>
  );
};

/** Legenda da escala de condição; opcionalmente com um valor por condição (km, contagem) */
// empilhada: uma condição por linha, com o valor encostado à direita (trilho da Visão geral)
export const LegendaCondicao = ({ valores, className, aoClicar, empilhada }: { valores?: Partial<Record<Condicao, ReactNode>>; className?: string; aoClicar?: (condicao: Condicao) => void; empilhada?: boolean }) => (
  <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground", empilhada && "flex-col flex-nowrap gap-y-1.5", className)}>
    {condicoes.map((condicao) => {
      const conteudo = (
        <>
          <span className={cn("size-2.5 shrink-0 rounded-[3px]", fundoCondicao[condicao])} aria-hidden />
          <span className="text-foreground">{condicao}</span>
          {valores?.[condicao] !== undefined && <span className={cn("tabular-nums", empilhada && "ml-auto")}>{valores[condicao]}</span>}
        </>
      );
      return (
        <li key={condicao} className={cn("flex items-center gap-1.5", empilhada && "w-full")}>
          {aoClicar ? (
            // after: área de toque de 24px sem mudar a altura da linha de 11px
            <button type="button" onClick={() => aoClicar(condicao)} className={cn("relative flex cursor-pointer items-center gap-1.5 rounded-sm after:absolute after:-inset-y-1 after:inset-x-0 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", empilhada && "w-full")}>
              {conteudo}
            </button>
          ) : (
            conteudo
          )}
        </li>
      );
    })}
  </ul>
);

/** Legenda do nível do problema (células e respostas) */
export const LegendaFaixa = ({ className }: { className?: string }) => (
  <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground", className)}>
    {(["baixo", "medio", "alto"] as Faixa[]).map((faixa) => (
      <li key={faixa} className={cn("flex items-center gap-1.5", corFaixa[faixa])}>
        <span className="size-2.5 rounded-[3px] bg-current/25 ring-1 ring-inset ring-current/60" aria-hidden />
        <span className="text-foreground">{rotuloFaixa[faixa]}</span>
      </li>
    ))}
  </ul>
);
