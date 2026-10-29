import * as React from "react";
import { cn } from "@/shared/utils/tailwind/cn";
import { SearchIcon, X } from "lucide-react";
import {
  useQlikSearch,
  SimplifiedSearchResultItem,
} from "@/shared/hooks/useQlikSearch";
import Typography from "../Typography/Typography";
import { getFieldLabel } from "@/shared/utils/qlik/getFieldLabel";
import type { FilterConfig } from "@/shared/qlik/filtros";

interface SearchBoxProps {
  className?: string;
  isMobile?: boolean;
  // Rótulos dos campos nos resultados (filtros.json); fora deles vale o mapa de getFieldLabel
  filters?: FilterConfig[];
}

const ROTULO_BUSCA = "Buscar…";

export default function SearchBox({ className, isMobile, filters = [] }: SearchBoxProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  // Resultado "ativo" pelas setas; Enter aplica o ativo (ou o primeiro)
  const [ativo, setAtivo] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const idLista = React.useId();

  const { search, setSearch, isSearching, error, results, applySelection } =
    useQlikSearch();

  const hasResults = results.length > 0;
  const isSearchActive = isFocused && search.length > 0;

  const handleClear = () => {
    setSearch("");
    inputRef.current?.focus();
  };

  // Só fecha quando aplicou: com erro, a caixa fica aberta mostrando a mensagem
  const aplicar = async (r: SimplifiedSearchResultItem) => {
    if (await applySelection(r)) setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Esc: limpa o texto; já vazio, solta o foco e o campo recolhe (o nativo de type=search só limpava)
    if (e.key === "Escape") {
      if (search) setSearch("");
      else inputRef.current?.blur();
      return;
    }
    if (!hasResults) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((a) => (a === null ? 0 : Math.min(results.length - 1, a + 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => (a === null ? results.length - 1 : Math.max(0, a - 1)));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Durante o debounce os resultados ainda são do texto anterior: aplicar um deles filtrava o valor errado
      if (isSearching) return;
      void aplicar(results[Math.min(ativo ?? 0, results.length - 1)]);
    }
  };

  const inputContainerClasses = cn(
    "relative flex w-full items-center text-foreground",
    isMobile && "h-[36px]",
  );

  return (
    <div
      data-expandida={isFocused}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false);
      }}
      className={cn(
        "relative",
        isMobile
          ? "w-full"
          : cn(
              // largura anima do slot de 300px (menos pr-2) até o header inteiro
              // sem sombra no wrapper: ela vazava pelo anel de foco translúcido e escurecia só a borda de baixo
              "ease-suave absolute top-0 right-2 z-50 transition-[width] duration-(--duracao-media) motion-reduce:transition-none",
              // @max-[36rem]: cabeçalho estreito (container no header), acompanha o slot de 208px
              isFocused ? "w-[calc(100%-0.5rem)]" : "w-[292px] @max-[36rem]:w-[200px] xl:w-[372px]",
            ),
        className,
      )}
    >
      <div className={inputContainerClasses}>
        <SearchIcon
          data-buscando={isSearching}
          className="lupa-busca pointer-events-none absolute left-3.5 z-10 h-4 w-4"
        />

        <input
          ref={inputRef}
          type="search"
          placeholder={ROTULO_BUSCA}
          aria-label={ROTULO_BUSCA}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isSearchActive && hasResults}
          aria-controls={idLista}
          aria-activedescendant={ativo !== null ? `${idLista}-${ativo}` : undefined}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            setAtivo(null);
            // Depois de aplicar um resultado o campo continua focado sem novo evento de foco: reabre ao digitar
            setIsFocused(true);
            setSearch(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          value={search}
          // Anel interno: expandida, a caixa encosta no topo/esquerda do <main> (overflow-hidden), que cortava o anel externo e deixava só embaixo/direita
          className="hover:border-muted-foreground bg-sidebar backdrop-blur-custom borda-vidro placeholder:text-muted-foreground h-9 w-full rounded-lg pr-10 pl-10 text-sm text-ellipsis transicao-feedback outline-none focus-visible:border-ring focus-visible:inset-ring-[3px] focus-visible:inset-ring-ring/50 focus-visible:[--tw-inset-shadow:0_0_#0000] [&::-webkit-search-cancel-button]:appearance-none"
        />

        <button
          type="button"
          aria-label="Limpar busca"
          aria-hidden={search.length === 0}
          tabIndex={search.length === 0 ? -1 : 0}
          className={cn(
            // 32 px: alvo de toque no celular; o ícone continua com 16 px
            "text-foreground hover:text-muted-foreground ease-suave absolute right-1 flex size-8 cursor-pointer items-center justify-center rounded-md outline-none transition-[opacity,scale,color] duration-(--duracao-curta) focus-visible:ring-[3px] focus-visible:ring-ring/70 motion-reduce:scale-100",
            search.length > 0
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-50 opacity-0",
          )}
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        inert={!isSearchActive}
        className={cn(
          "text-foreground ease-suave absolute top-full right-0 left-0 z-50 mt-2 w-full origin-top transition-[opacity,translate,scale] motion-reduce:translate-y-0 motion-reduce:scale-100",
          isSearchActive
            ? "translate-y-0 scale-100 opacity-100 duration-(--duracao-media)"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0 duration-(--duracao-curta)",
        )}
      >
        <div className="borda-vidro bg-sidebar backdrop-blur-custom rounded-xl p-2">
          <div role="status">
            {/* Resultados anteriores ficam enquanto a lupa indica a nova busca; "Buscando…" só sem lista */}
            {isSearching && !hasResults && (
              <Typography className="animate-esmaecer text-foreground text-sm">
                Buscando…
              </Typography>
            )}
            {error && (
              <Typography className="animate-esmaecer text-destructive text-sm">
                {error}
              </Typography>
            )}

            {isSearchActive && !isSearching && !error && !hasResults && (
              <Typography className="animate-esmaecer text-foreground text-sm">
                Nenhum resultado.
              </Typography>
            )}
          </div>

          {hasResults && (
            <ul id={idLista} role="listbox" aria-label="Resultados da busca" data-revelar="busca" className="max-h-56 overflow-y-auto">
              {results.map((r: SimplifiedSearchResultItem, idx: number) => (
                <li key={idx} id={`${idLista}-${idx}`} role="option" aria-selected={ativo === idx} data-ordem style={{ "--ordem": idx } as React.CSSProperties}>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={cn(
                      "hover:bg-accent w-full cursor-pointer rounded p-2 text-left transicao-feedback",
                      ativo === idx && "bg-accent",
                    )}
                    onClick={() => void aplicar(r)}
                  >
                    <div className="text-foreground text-sm">{r.text}</div>
                    {/* Rótulo do campo, não o nome técnico (deMedicao, deEmail…) */}
                    <div className="text-muted-foreground text-xs">{getFieldLabel(r.field, filters)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
