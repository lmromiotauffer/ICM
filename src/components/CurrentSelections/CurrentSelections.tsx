import { Trash, X } from "lucide-react";
import { Badge } from "../shadcn/badge";
import { Button } from "../shadcn/button";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { cn } from "@/shared/utils/tailwind/cn";
import { FieldSelections } from "../FieldSelections/FieldSelections";
import { useQlikSelections } from "@cluster-data-experience/qlik-modules";
import { useLayoutEffect, useRef, useState } from "react";
import { FilterSheet } from "../FilterSheet/FilterSheet";
import type { FilterConfig } from "@/shared/qlik/filtros";
import { getFieldLabel } from "@/shared/utils/qlik/getFieldLabel";
import { movimentoReduzido } from "@/shared/hooks/useMovimentoReduzido";

export type CurrentSelectionsProps = {
  selections: {
    valor: string;
    field: string;
    limpar: () => void;
  }[];
  filters?: FilterConfig[];
};

const anelFoco =
  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/70 focus-visible:border-ring";

type PosicaoChip = { el: HTMLElement; x: number; y: number; largura: number; texto: string | null };

// Deslocamento ainda aplicado por uma animação em curso (para interromper sem salto)
const deslocamentoAtual = (el: HTMLElement) => {
  const translate = getComputedStyle(el).translate;
  if (!translate || translate === "none") return [0, 0];
  const [x = 0, y = 0] = translate.split(" ").map(parseFloat);
  return [x, y];
};

export const CurrentSelections: React.FC<CurrentSelectionsProps> = ({
  selections,
  filters = [],
}) => {
  const { handleClearAll } = useQlikSelections();
  const focarBarra = () => document.querySelector<HTMLElement>('[data-slot="popover-trigger"]')?.focus();
  const listRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const hiddenCount = Math.max(0, selections.length - visibleCount);

  useLayoutEffect(() => {
    const list = listRef.current;
    const overflow = overflowRef.current;
    if (!list || !overflow) return;
    const chips = Array.from(list.querySelectorAll<HTMLElement>("[data-selection-chip]"));
    const measure = () => {
      const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
      const available = list.clientWidth - 8; // Espaço para o anel de foco.
      const widths = chips.map((chip) => chip.getBoundingClientRect().width);
      const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * gap;
      const limit = total <= available ? available : available - overflow.getBoundingClientRect().width - gap;
      let used = 0;
      let count = 0;
      for (const width of widths) {
        const next = used + (count > 0 ? gap : 0) + width;
        if (next > limit) break;
        used = next;
        count++;
      }
      setVisibleCount(count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [list, overflow, ...chips].forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [selections, filters]);

  // Remoção: o chip removido some no lugar onde estava e os vizinhos deslizam até a nova
  // posição (FLIP). Roda depois da medição para o chip fantasma não entrar na contagem.
  const posicoesRef = useRef(new Map<string, PosicaoChip>());
  useLayoutEffect(() => {
    const list = listRef.current;
    const anteriores = posicoesRef.current;
    const atuais = new Map<string, PosicaoChip>();
    list?.querySelectorAll<HTMLElement>("[data-field]").forEach((el) => {
      atuais.set(el.dataset.field!, { el, x: el.offsetLeft, y: el.offsetTop, largura: el.offsetWidth, texto: el.textContent });
    });
    posicoesRef.current = atuais;
    if (!list || anteriores.size === 0) return;

    const estilo = getComputedStyle(document.documentElement);
    const reduzido = movimentoReduzido();

    // Valor trocado no mesmo campo: a key não muda, então o rótulo entra em foco como um chip novo
    atuais.forEach(({ el, texto }, campo) => {
      const antes = anteriores.get(campo);
      if (!antes || antes.texto === texto || el.classList.contains("invisible")) return;
      el.firstElementChild?.animate(
        [reduzido ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" }, { opacity: 1, filter: "none" }],
        {
          duration: parseFloat(estilo.getPropertyValue("--duracao-media")),
          easing: estilo.getPropertyValue("--ease-suave"),
        },
      );
    });

    // Com remoção, os vizinhos esperam o chip sumir: deslizar junto cruzava os rótulos por cima da imagem que sai
    const duracaoSaida = parseFloat(estilo.getPropertyValue("--duracao-curta"));
    const houveSaida = [...anteriores].some(([campo, { el }]) => !atuais.has(campo) && !el.classList.contains("invisible"));

    if (!reduzido) {
      atuais.forEach(({ el, x, y }, campo) => {
        const antes = anteriores.get(campo);
        // Re-render sem mudança de layout não reinicia o deslize em curso
        if (!antes || (antes.x === x && antes.y === y)) return;
        const [tx, ty] = deslocamentoAtual(el);
        el.getAnimations().forEach((animacao) => animacao.id === "deslizar" && animacao.cancel());
        const dx = antes.x + tx - x;
        const dy = antes.y + ty - y;
        el.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
          id: "deslizar",
          duration: parseFloat(estilo.getPropertyValue("--duracao-media")),
          easing: estilo.getPropertyValue("--ease-suave"),
          delay: houveSaida ? duracaoSaida : 0,
          fill: "backwards", // segura a posição antiga durante a espera
        });
      });
    }

    anteriores.forEach(({ el, x, y, largura }, campo) => {
      if (atuais.has(campo) || el.classList.contains("invisible")) return;
      // O React já descartou o nó; ele volta só como imagem estática, fora do fluxo
      el.classList.remove("animate-entrar-chip");
      el.removeAttribute("data-selection-chip");
      el.removeAttribute("data-field");
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
      Object.assign(el.style, { position: "absolute", left: `${x}px`, top: `${y}px`, width: `${largura}px`, pointerEvents: "none" });
      list.append(el);
      const saida = el.animate(
        [{ opacity: 1 }, reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.9, filter: "blur(2px)" }],
        {
          duration: duracaoSaida,
          easing: estilo.getPropertyValue("--ease-saida"),
          fill: "forwards",
        },
      );
      saida.onfinish = () => el.remove();
    });
  }, [selections]);

  const vazio = selections.length === 0;

  // Reserva a mesma altura com ou sem seleções e mantém espaço para o foco dos chips.
  // A lista fica sempre montada: ao limpar tudo, os chips saem no lugar em vez de sumir num quadro.
  return (
    <header aria-label="Filtros aplicados" className="relative flex min-h-11 min-w-0 w-full items-center gap-2 py-1">
      {vazio && (
        // Absoluto: entrar no fluxo deslocaria a lista e os chips em saída pulariam.
        // Espera o último chip sumir para não aparecer por cima dele.
        <span className="text-muted-foreground animate-esmaecer absolute inset-y-0 left-0 flex items-center text-sm [animation-delay:var(--duracao-curta)] [animation-fill-mode:backwards]">
          Nenhum filtro aplicado.
        </span>
      )}
      <span inert={vazio} className={cn("text-muted-foreground hidden shrink-0 text-xs transicao-feedback xl:inline", vazio && "opacity-0")}>
        Filtros aplicados:
      </span>
      <div className="relative min-w-0 flex-1">
        {/* min-h-9: vazia, a lista encolheria e o overflow-clip cortaria o último chip em saída */}
        <div ref={listRef} className="relative flex min-h-9 min-w-0 items-center gap-2 overflow-clip p-1">
          {selections.map(({ valor, field, limpar }, index) => {
            const fieldLabel = getFieldLabel(field, filters);
            const displayLabel = `${fieldLabel}: ${valor}`;
            return (
              <Popover key={field}>
                <Badge
                  data-selection-chip
                  data-field={field}
                  inert={index >= visibleCount}
                  variant="outline"
                  className={cn("bg-custom-bg-input-50 border-input animate-entrar-chip h-7 min-w-0 max-w-72 shrink-0 gap-1 py-0 pr-1 pl-3 text-sm font-normal [&_svg]:size-4", index >= visibleCount && "invisible")}
                >
                  <PopoverTrigger
                    className={cn("min-w-0 truncate cursor-pointer rounded-sm", anelFoco)}
                    aria-label={`Ver valores do filtro ${displayLabel}`}
                    title={displayLabel}
                  >
                    {displayLabel}
                  </PopoverTrigger>
                  {/* X com área própria: antes ficava dentro do gatilho do popover, dois alvos num só elemento */}
                  <button
                    type="button"
                    aria-label={`Remover filtro ${displayLabel}`}
                    // O chip some com o foco dentro: devolve o foco à barra antes, senão cai no body
                    onClick={() => {
                      focarBarra();
                      limpar();
                    }}
                    className={cn(
                      "relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm transicao-feedback before:absolute before:inset-0.5 before:rounded-sm before:transicao-feedback hover:before:bg-accent after:absolute after:-inset-1.5",
                      anelFoco,
                    )}
                  >
                    <X className="relative" />
                  </button>
                </Badge>
                <PopoverContent aria-label={`Valores de ${fieldLabel}`} className="border-none p-0">
                  <FieldSelections field={field} label={fieldLabel} />
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
        <div ref={overflowRef} inert={hiddenCount === 0} className={cn("absolute inset-y-0 right-0 flex items-center", hiddenCount === 0 && "invisible")}>
          <FilterSheet
            filters={filters}
            fieldsWithSelections={selections.map(({ field }) => field)}
            somenteAplicados
            trigger={
              <Button variant="outline" size="sm" className="bg-sidebar border-input text-secondary-foreground h-7 min-w-24 rounded-[4px] font-normal active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100" aria-label={`Ver todos os filtros aplicados (${hiddenCount} oculto${hiddenCount > 1 ? "s" : ""})`}>
                +{hiddenCount} filtro{hiddenCount > 1 ? "s" : ""}
              </Button>
            }
          />
        </div>
      </div>
      <Button
        variant="link"
        size="sm"
        aria-label="Limpar filtros"
        inert={vazio}
        data-visivel={!vazio}
        className={cn("botao-limpar text-destructive ml-auto shrink-0 pl-2 underline underline-offset-[25%]", vazio && "opacity-0")}
        onClick={() => {
          focarBarra();
          handleClearAll();
        }}
      >
        <Trash className="icone-lixeira" />
        <span className="hidden lg:flex">Limpar filtros</span>
      </Button>
    </header>
  );
};
