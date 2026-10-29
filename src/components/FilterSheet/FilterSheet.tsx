import { Filter, Trash, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../shadcn/sheet";
import Typography from "../Typography/Typography";
import { useState } from "react";
import Tabs from "../Tabs/Tabs";
import { Button } from "../shadcn/button";
import { Badge } from "../shadcn/badge";
import { FilterObjectContainer } from "@/shared/components/FilterObjectContainer/FilterObjectContainer";
import { useQlikSelections } from "@cluster-data-experience/qlik-modules";
import { FieldSelections } from "../FieldSelections/FieldSelections";
import type { FilterConfig } from "@/shared/qlik/filtros";
import { getFieldLabel } from "@/shared/utils/qlik/getFieldLabel";

type FilterSheetProps = {
  filters: FilterConfig[];
  fieldsWithSelections: string[];
  trigger?: React.ReactNode;
  // Só a lista de filtros aplicados, sem abas (gatilho "ver todos" dos chips da barra)
  somenteAplicados?: boolean;
  // Todos os filtros, para rotular as seleções; `filters` pode ser só os que não couberam na barra
  rotulos?: FilterConfig[];
};

export const FilterSheet: React.FC<FilterSheetProps> = ({
  filters,
  fieldsWithSelections,
  trigger,
  somenteAplicados = false,
  rotulos = filters,
}) => {
  const { handleClearAll } = useQlikSelections();
  const [isOpen, setIsOpen] = useState(false);
  const abaInicial = somenteAplicados ? "selections" : "filters";
  const [selectedTab, setSelectedTab] = useState<string>(abaInicial);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      if (open) {
        setSelectedTab(abaInicial);
      }
      setIsOpen(open);
    }}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            variant="outline"
            aria-label={
              fieldsWithSelections.length > 0
                ? `Filtros (${fieldsWithSelections.length} aplicado${fieldsWithSelections.length > 1 ? "s" : ""})`
                : "Filtros"
            }
            className="w-10 h-10 rounded-lg relative flex cursor-pointer border border-input bg-sidebar"
          >
            <Filter className="text-muted-foreground size-4" />
            {fieldsWithSelections.length > 0 && (
              <Badge key={fieldsWithSelections.length} variant="destructive" className="animate-surgir-contador absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center px-1 py-0 font-medium tabular-nums">
                {fieldsWithSelections.length}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent overlayClassName="bg-black/20" className="bg-sidebar w-full max-w-md gap-0 borda-vidro rounded-lg backdrop-blur-[20px] shadow-2xl">
        <SheetHeader className="border-border flex border-b px-4 pt-6 pb-0">
          {/* O botão de fechar fica fora do título: ele dá nome ao diálogo e não pode anunciar "Filtros Fechar filtros" */}
          <div className="flex w-full items-center justify-between">
            <SheetTitle className="flex flex-row">
              <Filter className="mr-2 text-foreground size-5" />
              <Typography
                variant="text-base"
                className="flex items-center gap-2"
              >
                Filtros
              </Typography>
            </SheetTitle>
            <SheetClose
              aria-label="Fechar filtros"
              className="text-foreground hover:bg-accent flex size-8 cursor-pointer items-center justify-center rounded outline-none transicao-feedback focus-visible:ring-[3px] focus-visible:ring-ring/70"
            >
              <X className="size-5" />
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">
            Painel de filtros do painel; os filtros valem para todas as páginas
          </SheetDescription>
          <Typography variant="text-2xs" className="font-medium pb-2">
            Os filtros valem para todas as páginas
          </Typography>

          {!somenteAplicados && (
            <Tabs
              tabs={[
                { label: rotulos.length === filters.length ? "Todos os filtros" : "Mais filtros", value: "filters" },
                { label: "Filtros aplicados", value: "selections" },
              ]}
              activeTab={selectedTab}
              onTabChange={setSelectedTab}
              className="mb-3"
            />
          )}
        </SheetHeader>

        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto px-4 pt-8 pb-4 [&>*]:shrink-0">
          {isOpen && selectedTab === "filters" && (
            <>
              {filters.map((filter, index) => (
                <FilterObjectContainer
                  key={filter.expression || index}
                  expressao={filter.expression}
                  label={filter.label}
                  modal={true}
                />
              ))}
            </>
          )}
          {isOpen && selectedTab === "selections" && (
            <>
              {fieldsWithSelections.map((field) => (
                <FieldSelections key={field} field={field} label={getFieldLabel(field, rotulos)} />
              ))}
            </>
          )}
          {isOpen && selectedTab === "selections" && fieldsWithSelections.length === 0 && (
            <Typography variant="text-sm" className="animate-esmaecer">Nenhum filtro aplicado.</Typography>
          )}
        </div>

        <SheetFooter>
          <Button
            // aria-disabled em vez de disabled: o botão não perde o foco quando a última seleção sai
            onClick={() => fieldsWithSelections.length > 0 && handleClearAll()}
            aria-disabled={fieldsWithSelections.length === 0 || undefined}
            data-visivel={fieldsWithSelections.length > 0}
            className="botao-limpar bg-foreground shadow-2xs text-primary-foreground rounded-lg hover:bg-foreground/90 active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100 aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            <Trash className="icone-lixeira" />
            Limpar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
