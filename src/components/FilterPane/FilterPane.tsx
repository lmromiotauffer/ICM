import { FilterSheet } from "../FilterSheet/FilterSheet";
import { Ellipsis, FilterIcon } from "lucide-react";
import {
  CurrentSelections,
  CurrentSelectionsProps,
} from "../CurrentSelections/CurrentSelections";
import { Button } from "../shadcn/button";
import Typography from "../Typography/Typography";
import { FilterObjectContainer } from "@/shared/components/FilterObjectContainer/FilterObjectContainer";
import { useMobileScreen } from "@/shared/hooks/useMobileScreen";
import type { FilterConfig } from "@/shared/qlik/filtros";

type FilterPaneProps = {
  filters: FilterConfig[];
  selections: CurrentSelectionsProps["selections"];
};

export const FilterPane: React.FC<FilterPaneProps> = ({ filters, selections }) => {
  // Abaixo de 1440px a barra não cabe com 6 gatilhos (medido: 1190px num contêiner de 1066 em 1366×768)
  const compacta = useMobileScreen(1440);
  // Abaixo de 1280px nem 4 cabem com o menu aberto ("Mais filtros" saía cortado em 1025px)
  const estreita = useMobileScreen(1280);
  // Abaixo de 1740px os 7 + botão "Filtros" não cabem (medido: 1386px numa linha de 1390 em 1720×900)
  const media = useMobileScreen(1740);
  // shortcut: teto de 7 vale para rótulos do tamanho dos atuais; se a barra voltar a estourar, medir com ResizeObserver
  const visiveis = estreita ? 3 : compacta ? 4 : media ? 6 : 7;
  // Filtros da barra; o restante vai para "Mais filtros" (sem repetir os visíveis)
  const displayFilters = filters.slice(0, visiveis);
  const moreFilters = filters.slice(visiveis);

  const fieldsWithSelections = selections.map((s) => s.field);

  return (
    <section aria-label="Filtros" className="flex min-w-0 w-full flex-col bg-sidebar/30">
      <div className="flex flex-row items-center justify-between">
        {displayFilters.length > 0 && (
          <div className="flex h-[56px] items-center gap-1.5">
            <span className="flex flex-row gap-1 items-center justify-center-safe text-foreground">
              <FilterIcon className="w-5 h-5 mb-1" />
              <Typography variant="text-sm">Filtros:</Typography>
            </span>
            {displayFilters.map((filter) => (
              <FilterObjectContainer
                key={filter.expression}
                expressao={filter.expression}
                label={filter.label}
                className="w-auto max-w-[280px] h-8 flex-1 grow rounded-sm"
              />
            ))}
          </div>
        )}

        {/* Sobrando filtro fora da barra: "Mais filtros" com as duas abas; senão, "Filtros" abre direto os aplicados */}
        <div className="ml-2">
          <FilterSheet
            filters={moreFilters.length > 0 ? moreFilters : filters}
            rotulos={filters}
            fieldsWithSelections={fieldsWithSelections}
            somenteAplicados={moreFilters.length === 0}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="bg-sidebar border-input text-secondary-foreground h-8 w-32 rounded-[4px] font-normal shadow-sm active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100"
              >
                <span className="text-secondary-foreground flex flex-row items-center justify-between gap-2">
                  <Ellipsis className="pontinhos-onda h-4 w-4 " />
                  {moreFilters.length > 0 ? "Mais filtros" : "Filtros"}
                </span>
              </Button>
            }
          />
        </div>
      </div>

      <hr className="border-input" />

      {/* A linha de filtros aplicados tem altura sempre reservada: aplicar o primeiro filtro não empurra a página */}
      <section className="flex min-w-0 w-full items-center justify-between">
        <CurrentSelections selections={selections} filters={filters} />
      </section>
    </section>
  );
};
