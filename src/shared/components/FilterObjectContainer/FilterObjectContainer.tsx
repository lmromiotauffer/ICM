import { useGenericListObject, useQlikSelections } from "@cluster-data-experience/qlik-modules";
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronDown } from "lucide-react";
import type { FilterObjectOption, FilterObjectOptionValue } from "@/components/FilterObject/@types/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover";
import { Button } from "@/components/shadcn/button";
import { Badge } from "@/components/shadcn/badge";
import Typography from "@/components/Typography/Typography";
import { ButtonMenu } from "@/components/FilterObject/components/ButtonMenu/ButtonMenu";
import { VirtualizedList } from "@/components/FilterObject/components/VirtualList/VirtualizedList";
import { cn } from "@/shared/utils/tailwind/cn";
import { toOption } from "@/shared/utils/qlik/toOption";
import { acrescentarOpcoes, mesclarOpcoes } from "./opcoesFiltro";
import { campoDaExpressao } from "@/shared/utils/qlik/getFieldLabel";

const CAMINHO = "/qListObjectDef";
const LINHAS_POR_PAGINA = 50;

type Fechar = (aceitar: boolean) => void;

type ListaFiltroProps = {
  expressao: string;
  origem: string;
  fechar: Fechar;
  // O container fecha por fora (clique fora, Esc) e precisa encerrar a seleção modal do objeto vivo
  encerrarRef: RefObject<Fechar>;
};

/** Lista de valores do campo. Só monta com o popover aberto: o objeto no engine existe a partir da primeira abertura. */
const ListaFiltro = ({ expressao, origem, fechar, encerrarRef }: ListaFiltroProps) => {
  // Possíveis primeiro (o desempate fica na ordem de carga, que é a cronológica em Ano/mês): com outro filtro
  // aplicado, a 1ª página vinha só de valores excluídos
  // qFieldLabels com a origem: a lib reaproveita o objeto de parâmetros iguais, e ao desmontar a lupa da tabela
  // removia os ouvintes do filtro da barra no mesmo campo (ou o contrário), congelando a lista aberta
  const parametros = useMemo(
    () => ({ qFieldDefs: [expressao], qFieldLabels: [origem], qSortCriterias: [{ qSortByState: 1 } as const] }),
    [expressao, origem],
  );
  const { data, layout, isLoading, isFetching, object, error: erroLista } = useGenericListObject(parametros);

  const [options, setOptions] = useState<FilterObjectOption[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Os próximos dados substituem a lista (busca, limpar, seleções em massa); fora isso, um layout novo
  // só atualiza o estado dos itens já carregados, para a lista rolada não voltar à primeira página
  const substituir = useRef(true);
  // Página pedida antes de uma busca nova pertence à lista antiga e é descartada
  const geracao = useRef(0);
  // Busca vazia não é aceita no Enter: aceitar "**" selecionava todos os valores do campo
  const busca = useRef("");

  const stateCounts = layout?.qListObject?.qDimensionInfo?.qStateCounts;
  const totalRows = layout?.qListObject?.qSize?.qcy || 0;

  useEffect(() => {
    if (!object) return;
    object.beginSelections([CAMINHO]);
    let encerrada = false;
    encerrarRef.current = (aceitar) => {
      if (encerrada) return;
      encerrada = true;
      object.endSelections(aceitar);
      object.abortListObjectSearch(CAMINHO);
    };
    // Desmontada sem passar por fechar (tabela remontada por key, sheet que sai da tela ao redimensionar):
    // o objeto não pode ficar em modo de seleção, senão as seleções nas tabelas passam a falhar em silêncio
    return () => encerrarRef.current(true);
  }, [object, encerrarRef]);

  useEffect(() => {
    // A marca de substituir vale até uma página extra ser carregada, não só para a próxima resposta:
    // com "a" e "ab" em voo, a resposta de "a" a gastava e a de "ab" só atualizava a lista de "a"
    const novas = (data ?? []).map(toOption);
    const trocar = substituir.current;
    setOptions((anteriores) => mesclarOpcoes(anteriores, novas, trocar));
  }, [data]);

  const handleGetNextPage = async () => {
    if (!object || isFetching || isLoadingMore) return;
    const pedido = geracao.current;
    setIsLoadingMore(true);
    setError(null);
    try {
      const pages = await object.getListObjectData(CAMINHO, [
        { qTop: options.length, qLeft: 0, qHeight: LINHAS_POR_PAGINA, qWidth: 1 },
      ]);
      if (pedido === geracao.current && pages?.[0]?.qMatrix.length) {
        const novas = pages[0].qMatrix.map(toOption);
        substituir.current = false;
        setOptions((anteriores) => acrescentarOpcoes(anteriores, novas));
      }
    } catch (err) {
      console.error("Erro ao carregar mais valores do filtro:", err);
      setError("Não foi possível carregar mais dados");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Lista nova a partir do topo
  const reiniciarLista = () => {
    substituir.current = true;
    geracao.current += 1;
    setResetKey((anterior) => anterior + 1);
  };

  // Só o valor clicado, em modo toggle: a seleção que não está na tela (outras páginas, fora da busca) fica como está
  const toggleOption = ({ qElemNumber }: FilterObjectOptionValue) => {
    // Otimista: marca na lista antes da resposta do engine
    setOptions((anteriores) =>
      anteriores.map((opcao) => (opcao.value.qElemNumber === qElemNumber ? { ...opcao, selected: !opcao.selected } : opcao)),
    );
    object?.selectListObjectValues(CAMINHO, [qElemNumber], true);
  };

  const selecaoEmMassa = (acao: () => unknown) => () => {
    substituir.current = true;
    geracao.current += 1;
    acao();
  };

  return (
    <>
      <VirtualizedList
        options={options}
        handleSearch={(search) => {
          reiniciarLista();
          busca.current = search;
          if (search) object?.searchListObjectFor(CAMINHO, `*${search}*`);
          else object?.abortListObjectSearch(CAMINHO);
        }}
        handleAcceptSearch={() => {
          if (!busca.current) return;
          reiniciarLista();
          object?.acceptListObjectSearch(CAMINHO, true);
        }}
        toggleOption={toggleOption}
        isFetching={isLoading || !!isFetching}
        isLoadingMore={isLoadingMore}
        // Erro da lib (objeto não criado, layout falhou): sem ele o spinner girava para sempre ou dizia "Sem correspondências"
        error={erroLista ? "Não foi possível carregar os valores" : error}
        hasMoreData={options.length < totalRows}
        handleGetNextPage={handleGetNextPage}
        resetKey={resetKey}
      />
      <ButtonMenu
        fechar={fechar}
        handleSelectPossible={selecaoEmMassa(() => object?.selectListObjectPossible(CAMINHO))}
        handleSelectAlternative={selecaoEmMassa(() => object?.selectListObjectAlternative(CAMINHO))}
        handleSelectExcluded={selecaoEmMassa(() => object?.selectListObjectExcluded(CAMINHO))}
        handleSelectAll={selecaoEmMassa(() => object?.selectListObjectAll(CAMINHO))}
        hasAlternative={(stateCounts?.qAlternative || 0) > 0}
        hasExcluded={(stateCounts?.qExcluded || 0) > 0}
        hasPossible={(stateCounts?.qOption || 0) > 0}
        handleClear={() => {
          reiniciarLista();
          object?.clearSelections(CAMINHO);
        }}
      />
    </>
  );
};

type FilterObjectProps = {
  expressao: string;
  label: string;
  modal?: boolean;
  className?: string;
  // Gatilho próprio (ex.: lupa no cabeçalho da tabela); sem ele, o botão com rótulo e contador
  trigger?: ReactNode;
};

export const FilterObjectContainer = ({ expressao, label, modal = false, className, trigger }: FilterObjectProps) => {
  const [aberto, setAberto] = useState(false);
  const encerrarRef = useRef<Fechar>(() => {});
  // Contador pela seleção do campo, não pela lista: o gatilho não precisa do objeto no engine
  const { items } = useQlikSelections();
  const campo = campoDaExpressao(expressao);
  const selecionados: number = items.find(({ fieldName }) => fieldName === campo)?.qSelectedCount ?? 0;

  const fechar: Fechar = (aceitar) => {
    encerrarRef.current(aceitar);
    setAberto(false);
  };

  return (
    <Popover open={aberto} onOpenChange={(abrir) => (abrir ? setAberto(true) : fechar(true))} modal={modal}>
      {/* Sem stopPropagation no clique: o Radix só fecha os outros popovers se o clique chegar ao document */}
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            className={cn(
              "bg-sidebar border-input text-foreground hover:bg-accent data-[state=open]:bg-accent flex w-full cursor-pointer items-center justify-start rounded-md border px-3 py-2 shadow-sm [&_svg]:pointer-events-auto active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100",
              className,
            )}
          >
            <div className="flex w-full min-w-0 items-center justify-between gap-1.5 rounded-md">
              <Typography variant="text-sm" className="min-w-0 flex-1 truncate text-start">
                {label}
              </Typography>
              {selecionados > 0 && (
                <Badge
                  key={selecionados}
                  variant="destructive"
                  aria-label={`${selecionados} selecionado${selecionados > 1 ? "s" : ""}`}
                  className="animate-surgir-contador h-4 min-w-4 justify-center px-1 py-0 font-medium tabular-nums"
                >
                  {selecionados}
                </Badge>
              )}
              <ChevronDown
                className={cn(
                  "h-4 flex-shrink-0 cursor-pointer transition-[rotate] duration-(--duracao-media) ease-(--ease-suave)",
                  aberto && "rotate-180",
                )}
              />
            </div>
          </Button>
        )}
      </PopoverTrigger>
      {/* z-[100]: acima do cabeçalho fixo da tabela (z-30/z-50) */}
      <PopoverContent align="start" aria-label={label} className="z-[100] w-(--radix-popover-trigger-width) min-w-72 overflow-hidden p-0">
        <ListaFiltro expressao={expressao} origem={trigger ? "cabecalho" : "barra"} fechar={fechar} encerrarRef={encerrarRef} />
      </PopoverContent>
    </Popover>
  );
};
