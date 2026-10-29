import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/utils/tailwind/cn";
import { mostrarAviso } from "@/components/Aviso/Aviso";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Button } from "@/components/shadcn/button";
import { celulasOrdemEngine, posicaoNaConfig } from "@/shared/utils/celulasOrdemEngine";
import { FilterObjectContainer } from "@/shared/components/FilterObjectContainer/FilterObjectContainer";
import "@/shared/styles/customTable.css";
import { cabecalhosPlanilha, contarDimensoes, linhasPlanilha, mapaVisualParaEngine, paginasExportacao } from "./exportarPlanilha";
import type { ColunaTabela } from "@/components/CartaoPainel/colunas";
import type { Cell, useTable } from "@cluster-data-experience/qlik-modules";

// Célula de dados; hover e seleção ficam em customTable.css
const celula =
  "h-10 border-r border-b border-input bg-sidebar p-2 align-middle text-xs leading-[1.4] text-foreground whitespace-normal [word-break:break-word]";


interface CustomTableProps {
  table: ReturnType<typeof useTable>;
  className?: string;
  rowsPerPage?: number;
  onRowsPerPageChange?: (value: number) => void;
  columnsConfig: ColunaTabela[];
  // Cada tabela exporta pelo próprio cartão; null é o cartão que ainda não montou o slot
  slotExportar: HTMLElement | null;
  nomeArquivo?: string;
  // Clicar em qualquer célula seleciona a primeira dimensão da linha (lista ranqueada, não grade de consulta)
  selecionarLinha?: boolean;
  // Lupa de filtro em cada cabeçalho de dimensão; desligada nas colunas estreitas do celular, onde ela comia o rótulo
  filtroNoCabecalho?: boolean;
  // Propriedades do hipercubo que o useTable não expõe (ex.: qSuppressZero); aplicadas ao montar e
  // mantidas nas trocas de página, que partem das propriedades vivas do objeto
  hipercubo?: Partial<EngineAPI.IHyperCubeDef>;
}

export const CustomTable: React.FC<CustomTableProps> = ({
  table,
  className,
  rowsPerPage: rowsPerPageProp,
  onRowsPerPageChange,
  columnsConfig,
  slotExportar,
  nomeArquivo,
  selecionarLinha = false,
  filtroNoCabecalho = true,
  hipercubo,
}) => {
  const {
    data,
    layout,
    isLoading,
    isFetching,
    toggleSort,
    selectCell,
    updateProperties,
    properties,
    getDataPage,
    error,
  } = table;

  const rowsPerPage = rowsPerPageProp || 100;
  const [exportando, setExportando] = useState(false);
  // A exportação pode terminar antes de a onda do ícone aparecer: ela roda ao menos um ciclo inteiro a cada clique
  const [ondaPlanilha, setOndaPlanilha] = useState(false);

  const totalRows = layout?.qHyperCube?.qSize?.qcy || 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  
  const qHyperCube = layout?.qHyperCube as (EngineAPI.IHyperCube & { qColumnOrder?: number[] }) | undefined;
  const numDims = useMemo(() => contarDimensoes(columnsConfig), [columnsConfig]);

  // Linhas com células na ordem do engine (dimensões primeiro), que é a ordem de visualToDataMap
  const linhas = useMemo(
    () => (data?.rows ?? []).map((row) => ({ ...row, cells: celulasOrdemEngine(row.cells, qHyperCube) })),
    [data, qHyperCube],
  );

  // Índice visual (da config) para índice de dados do Qlik
  const visualToDataMap = useMemo(() => mapaVisualParaEngine(columnsConfig), [columnsConfig]);

  // Alinhamento pelo tipo da coluna, igual no cabeçalho, nas células e nos totais: medidas à direita,
  // dimensões (inclusive códigos numéricos, que são rótulos) à esquerda. Dimensão que é quantidade
  // (ex.: extensão em km) pede direita com "alinhamento": "direita" na config da coluna.
  const alinharDireita = (visualIndex: number) =>
    visualToDataMap[visualIndex] >= numDims ||
    columnsConfig[visualIndex]?.alinhamento === "direita";

  // Pega a posição atual diretamente do layout retornado pelo Qlik
  const currentTop = layout?.qHyperCube?.qDataPages?.[0]?.qArea?.qTop ?? 0;
  const currentPageNumber = Math.floor(currentTop / rowsPerPage) + 1;

  const startRow = currentTop + 1;
  const endRow = Math.min(startRow + (data?.rows?.length || 0) - 1, totalRows);

  const prevTotalRows = useRef(totalRows);

  // Quando os dados chegam por ação do usuário, as linhas assentam no sentido da mudança (mesmo gesto da
  // lista de obras): ordenação crescente ou página seguinte sobem; decrescente ou página anterior descem;
  // filtro só esmaece. A primeira chegada entra em cascata; a reaplicação do hipercubo logo depois não anima de novo.
  const colunaOrdenada = qHyperCube?.qEffectiveInterColumnSortOrder?.[0] ?? -1;
  const sentidoOrdenacao =
    colunaOrdenada < numDims
      ? qHyperCube?.qDimensionInfo?.[colunaOrdenada]?.qSortIndicator
      : qHyperCube?.qMeasureInfo?.[colunaOrdenada - numDims]?.qSortIndicator;
  const dadosAnteriores = useRef<{ topo: number; ordem: string; total: number } | null>(null);
  const emSelecao = useRef(false);
  // Dados que chegam só porque o hipercubo extra foi aplicado ao montar: a entrada continua, sem reiniciar
  const aplicandoHipercubo = useRef(false);
  const [chegada, setChegada] = useState<string | null>(null);
  // key do tbody: a mesma chegada repetida (duas páginas seguidas no mesmo sentido) remonta as linhas e anima de novo
  const [serieChegada, setSerieChegada] = useState(0);
  const [paginasAbertas, setPaginasAbertas] = useState(false);
  // useLayoutEffect: o atributo precisa entrar antes da pintura, senão as linhas novas aparecem por um frame,
  // apagam e só então esmaecem
  useLayoutEffect(() => {
    if (!data) return;
    if (aplicandoHipercubo.current) {
      aplicandoHipercubo.current = false;
      return;
    }
    // Página fora do intervalo depois de um filtro (0 linhas, total > 0): o handleGoToPage(1) traz as linhas de verdade
    if ((data.rows?.length ?? 0) === 0 && totalRows > 0) return;
    const ordem = `${colunaOrdenada}${sentidoOrdenacao}`;
    const anteriores = dadosAnteriores.current;
    // Filtro com a tabela além da 1ª página: estes dados são da página antiga e o handleGoToPage(1) já está a caminho;
    // animar aqui fazia as linhas esmaecerem duas vezes em 150 ms
    if (anteriores && totalRows !== anteriores.total && currentTop > 0) return;
    dadosAnteriores.current = { topo: currentTop, ordem, total: totalRows };
    // Seleção feita nesta tabela chega em dois passos (beginSelections marca a célula, endSelections confirma):
    // nenhum dos dois anima, senão as linhas apagam e reacendem antes de a tabela ficar só com a linha clicada
    const confirmandoSelecao = emSelecao.current;
    emSelecao.current = !!layout?.qSelectionInfo?.qInSelections;
    // Primeiros dados (tabela recém-montada, ex.: troca de aba): as linhas entram, em vez de saltar do spinner
    if (!anteriores) return setChegada("entrada");
    if (emSelecao.current || confirmandoSelecao) return;
    setSerieChegada((serie) => serie + 1);
    if (ordem !== anteriores.ordem) setChegada(sentidoOrdenacao === "D" ? "ordem-desc" : "ordem-asc");
    // Total mudou = filtro (mesmo quando a página voltou à primeira junto)
    else if (totalRows !== anteriores.total) setChegada("dados");
    else if (currentTop !== anteriores.topo) setChegada(currentTop > anteriores.topo ? "ordem-asc" : "ordem-desc");
    else setChegada("dados");
  }, [data]);
  useEffect(() => {
    if (!chegada) return;
    const timer = setTimeout(() => setChegada(null), 600);
    return () => clearTimeout(timer);
  }, [chegada]);

  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const resizingRef = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  // Cursor e seleção de texto do documento enquanto uma coluna é redimensionada
  useEffect(() => {
    if (resizingIndex === null) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingIndex]);

  // Coluna curta (ex.: posição, ano/mês) pede "largura" em px na config; arrastar o handle continua valendo.
  // "resto": a coluna toma a folga da tabela, para a última coluna não esticar sozinha
  const estiloLargura = (i: number) => {
    // Record<number, number> não admite undefined no índice: o cast devolve o "sem largura arrastada"
    const largura: number | "resto" | undefined =
      (columnWidths[i] as number | undefined) ?? columnsConfig[i]?.largura;
    if (largura === "resto") return { width: "100%", minWidth: "160px", maxWidth: "none" };
    return largura
      ? { width: `${largura}px`, minWidth: `${largura}px`, maxWidth: `${largura}px` }
      : { width: "200px", minWidth: "100px", maxWidth: "none" };
  };

  // Parte das propriedades vivas do objeto: `properties` do hook é a configuração inicial e não acompanha
  // a ordenação escolhida (toggleSort grava só no objeto), que sumiria ao trocar de página
  const propsComPagina = async (qTop: number, qHeight: number) => {
    const atuais = (await table.object?.getProperties()) ?? properties;
    return {
      ...atuais,
      qHyperCubeDef: {
        ...atuais.qHyperCubeDef,
        ...hipercubo,
        qInitialDataFetch: [
          {
            qTop,
            qLeft: 0,
            qWidth: atuais.qHyperCubeDef?.qInitialDataFetch?.[0]?.qWidth || layout?.qHyperCube?.qSize?.qcx || 20,
            qHeight,
          },
        ],
      },
    };
  };

  const handleGoToPage = async (page: number) => {
    if (page < 1 || page > totalPages) return;

    const targetTop = (page - 1) * rowsPerPage;

    await updateProperties(await propsComPagina(targetTop, rowsPerPage));
  };

  // Captura do ponteiro no handle: o arraste segue fora dele e o clique final cai no handle (que não propaga),
  // então soltar sobre o cabeçalho não dispara a ordenação
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const th = e.currentTarget.parentElement;
    if (!th) return;

    resizingRef.current = {
      index,
      startX: e.clientX,
      startWidth: th.offsetWidth,
    };
    setResizingIndex(index);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizingRef.current) return;

    const { index, startX, startWidth } = resizingRef.current;
    const newWidth = Math.max(100, startWidth + e.clientX - startX);

    setColumnWidths((prev) => ({
      ...prev,
      [index]: newWidth,
    }));
  };

  const handleResizeEnd = () => {
    resizingRef.current = null;
    setResizingIndex(null);
  };

  // As propriedades extras entram assim que o objeto existe; ordenar e selecionar leem o objeto ao vivo e as preservam.
  // Também sem hipercubo extra: a lib reaproveita o objeto entre montagens, e ele voltava na página e no tamanho
  // de página da visita anterior enquanto o seletor mostrava o tamanho inicial
  const objeto = table.object;
  useEffect(() => {
    if (!objeto) return;
    aplicandoHipercubo.current = true;
    propsComPagina(0, rowsPerPage).then(updateProperties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objeto]);

  useEffect(() => {
    if (prevTotalRows.current !== totalRows) {
      if (currentTop > 0) {
        handleGoToPage(1);
      }
      prevTotalRows.current = totalRows;
    }
  }, [totalRows, currentTop]);

  // toggleSort e selectCell da lib esperam a posição da coluna na config, não o índice do engine
  const posicaoConfig = (indiceEngine: number) => posicaoNaConfig(qHyperCube?.qColumnOrder, indiceEngine);
  // selectHyperCubeCells conta a linha no hipercubo inteiro, não na página: soma o topo da página atual
  const selecionarCelula = (rowIndex: number, indiceSelecao: number) => selectCell(currentTop + rowIndex, posicaoConfig(indiceSelecao));

  const handleRowsPerPageChange = async (value: string) => {
    const newRowsPerPage = parseInt(value, 10);
    
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newRowsPerPage);
    }

    await updateProperties(await propsComPagina(0, newRowsPerPage));
  };

  // Exporta a tabela INTEIRA (não só a página carregada) para o Excel
  const handleExportExcel = async () => {
    if (exportando || totalRows === 0) return;
    setExportando(true);
    try {
      // Import dinâmico: a lib só entra no bundle quando o usuário exporta
      const XLSX = await import("xlsx");

      // Total e ordenação do objeto vivo no início e no fim: um filtro ou ordenação no meio da exportação
      // misturava páginas de dois recortes na mesma planilha
      const recorte = async () => {
        const cubo = ((await table.object?.getLayout()) as { qHyperCube?: EngineAPI.IHyperCube } | undefined)?.qHyperCube;
        const sentidos = [...(cubo?.qDimensionInfo ?? []), ...(cubo?.qMeasureInfo ?? [])].map((info) => info.qSortIndicator);
        return JSON.stringify([cubo?.qSize?.qcy, cubo?.qEffectiveInterColumnSortOrder, sentidos]);
      };
      const recorteInicial = await recorte();

      const qcx = qHyperCube?.qSize?.qcx || columnsConfig.length || 1;
      // Em sequência: em paralelo eram centenas de pedidos de uma vez num socket só.
      // Cada página vira linhas da planilha ao chegar: guardar as células cruas da tabela inteira pesava demais no celular
      const linhas: (string | number)[][] = [];
      for (const pagina of paginasExportacao(totalRows, qcx)) {
        const resposta = ((await getDataPage([pagina], "S")) ?? []) as EngineAPI.INxDataPage[];
        const matriz = resposta.flatMap((p) => p.qMatrix).map((celulas) => celulasOrdemEngine(celulas as unknown as Cell[], qHyperCube));
        linhas.push(...linhasPlanilha(matriz, columnsConfig));
      }
      if ((await recorte()) !== recorteInicial) {
        mostrarAviso("A tabela mudou durante a exportação", {
          tipo: "erro",
          descricao: "Um filtro ou ordenação foi alterado. Baixe a planilha de novo.",
        });
        return;
      }

      const worksheet = XLSX.utils.aoa_to_sheet([cabecalhosPlanilha(columnsConfig), ...linhas]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");

      // Data local no nome: em UTC, à noite o arquivo saía datado de amanhã
      const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      XLSX.writeFile(workbook, `${nomeArquivo || "dados"}_${dataHoje}.xlsx`);
      mostrarAviso("Planilha baixada", {
        tipo: "sucesso",
        descricao: `${linhas.length.toLocaleString("pt-BR")} linhas exportadas.`,
      });
    } catch (erro) {
      console.error("Erro ao exportar a tabela:", erro);
      mostrarAviso("Não foi possível gerar a planilha", { tipo: "erro", descricao: "Tente novamente em instantes." });
    } finally {
      setExportando(false);
    }
  };

  // Também durante o spinner: montado só com dados, o botão entrava no cabeçalho do cartão depois e empurrava as abas
  // (salto de 152 px na carga). disabled só sem linhas: desabilitar durante a exportação tirava o foco do botão e o
  // Aviso, ao fechar, devolvia o foco ao body
  const botaoExportar =
    slotExportar &&
    createPortal(
      <Button
        onClick={() => {
          setOndaPlanilha(true);
          handleExportExcel();
        }}
        disabled={totalRows === 0}
        aria-disabled={exportando || undefined}
        aria-busy={exportando}
        title={totalRows === 0 ? "Nada para baixar com os filtros atuais" : `Baixa todas as ${totalRows.toLocaleString("pt-BR")} linhas com os filtros atuais`}
        className="flex items-center gap-2 active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100"
      >
        <FileSpreadsheet
          className="icone-planilha h-4 w-4"
          data-onda={ondaPlanilha}
          // Para quando a primeira célula (3º path) fecha o ciclo: a onda já passou por todas e elas
          // estão em repouso. Só depois que a exportação terminou.
          onAnimationIteration={(e) => {
            if (!exportando && e.target === e.currentTarget.children[2]) setOndaPlanilha(false);
          }}
        />
        Baixar planilha
      </Button>,
      slotExportar,
    );

  if (isLoading && !data) {
    return (
      <>
        {botaoExportar}
        <div
          role="status"
          aria-label="Carregando dados"
          // Só aparece se a carga demorar mais que um instante: numa troca de aba rápida ele não chega a piscar
          className="animate-esmaecer flex h-full w-full items-center justify-center [animation-delay:var(--duracao-curta)] [animation-fill-mode:backwards]"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <div className={cn("flex h-full flex-col text-xs leading-normal customTable", className)} aria-busy={isLoading || !!isFetching}>
      {botaoExportar}
      {/* translateZ (transform-gpu): camada própria para a rolagem com backdrop-filter.
          min-h-0 sem flex-1: a moldura abraça as linhas e só encolhe (com rolagem) quando a tabela passa do cartão */}
      <div className="relative min-h-0 overflow-auto rounded-lg borda-vidro bg-transparent bg-clip-padding backdrop-blur-custom transform-gpu will-change-transform">
        <table className="w-max min-w-full table-auto border-separate border-spacing-0 rounded-lg tabular-nums">
          <thead className="sticky top-0 z-[30] bg-sidebar">
            <tr>
              {columnsConfig.map((_, visualIndex) => {
                const qlikIndex = visualToDataMap[visualIndex];
                
                // Configuração visual
                const config = columnsConfig?.[visualIndex];
                const isDimensionByConfig = config?.type === "dimension";
                const configLabel = isDimensionByConfig 
                  ? config?.qFieldLabels?.[0] 
                  : config?.qLabel;

                // Informação do Qlik para fallback e ordenação
                const isDimensionQlik = qlikIndex < numDims;
                const info = isDimensionQlik
                  ? qHyperCube?.qDimensionInfo[qlikIndex]
                  : qHyperCube?.qMeasureInfo[qlikIndex - numDims];

                const title = configLabel || info?.qFallbackTitle || "";
                
                const isSortedColumn = layout?.qHyperCube?.qEffectiveInterColumnSortOrder?.[0] === qlikIndex;
                const sortIndicator = info?.qSortIndicator;

                const alignRight = alinharDireita(visualIndex);

                return (
                  <th
                    key={visualIndex}
                    className={cn(
                      "relative h-10 cursor-pointer border-r border-b border-input bg-sidebar align-middle text-custom-table-label backdrop-blur-custom outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/70",
                      // Primeira coluna fixa na rolagem lateral
                      visualIndex === 0 && "sticky left-0 z-[50]"
                    )}
                    style={estiloLargura(visualIndex)}
                    // Descrição da coluna (ex.: referências da média) como dica do cabeçalho
                    title={config?.descricao}
                    // Ordenação também pelo teclado; o botão de filtro dentro do cabeçalho tem o próprio Enter
                    tabIndex={0}
                    aria-sort={
                      isSortedColumn && sortIndicator
                        ? sortIndicator === "A" ? "ascending" : "descending"
                        : undefined
                    }
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      toggleSort(posicaoConfig(qlikIndex));
                    }}
                    // Clique na lupa ou em portal (popover e menu sobem pela árvore React, não pelo DOM) não ordena
                    onClick={(e) => {
                      const alvo = e.target as Element;
                      if (!e.currentTarget.contains(alvo) || alvo.closest('[data-slot="popover-trigger"]')) return;
                      toggleSort(posicaoConfig(qlikIndex));
                    }}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 h-full",
                        alignRight ? "justify-end" : "justify-between",
                      )}
                    >
                      <div className={cn("flex items-center gap-2 min-w-0", alignRight && "flex-row-reverse")}>
                        <span className="text-left truncate">
                          {title}
                        </span>
                        {isSortedColumn && sortIndicator && (
                          // Uma seta só: surge na coluna recém-ordenada e gira ao inverter o sentido
                          <span className="animate-esmaecer flex-shrink-0">
                            <ArrowUp
                              className={cn(
                                "h-3 w-3 transition-[rotate] duration-(--duracao-media) ease-(--ease-suave)",
                                sortIndicator !== "A" && "rotate-180",
                              )}
                            />
                          </span>
                        )}
                      </div>
                      {/* Só campo de verdade: dimensão calculada ("=Date(...)") não vira list object por nome */}
                      {filtroNoCabecalho && isDimensionByConfig && config?.qFieldDefs?.[0] && !config.qFieldDefs[0].startsWith("=") && (
                        <FilterObjectContainer
                          expressao={config.qFieldDefs[0]}
                          label={title}
                          trigger={
                            <button
                              type="button"
                              aria-label={`Filtrar ${title}`}
                              title={`Filtrar ${title}`}
                              className="relative before:absolute before:-inset-2 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md transicao-feedback hover:bg-accent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/70"
                            >
                              <Search className="h-3 w-3 text-muted-foreground" />
                            </button>
                          }
                        />
                      )}
                    </div>
                    <div
                      className={cn(
                        "resize-handle",
                        resizingIndex === visualIndex && "resizing"
                      )}
                      onPointerDown={(e) => handleResizeStart(e, visualIndex)}
                      onPointerMove={handleResizeMove}
                      onPointerUp={handleResizeEnd}
                      onPointerCancel={handleResizeEnd}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody key={serieChegada} className="bg-sidebar" data-revelar={chegada ?? undefined}>
            {/* Falha da lib: data vira null mas o layout antigo fica, e o rodapé dizia "1 - 0 de 4.000" sem linhas */}
            {error && !data ? (
              <tr>
                <td colSpan={columnsConfig.length} className="h-24 text-center">
                  <div role="status" className="animate-esmaecer flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
                    <p className="text-lg font-medium">Não foi possível carregar os dados</p>
                    <p className="text-sm">Verifique a conexão e tente de novo em instantes.</p>
                  </div>
                </td>
              </tr>
            ) : totalRows === 0 && !isLoading && !isFetching ? (
              <tr>
                <td colSpan={columnsConfig.length} className="h-24 text-center">
                  <div role="status" className="animate-esmaecer flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
                    <p className="text-lg font-medium">Nenhum dado encontrado</p>
                    <p className="text-sm">Tente uma nova combinação de filtros para ver resultados.</p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {linhas.map((row, rowIndex) => (
                  <tr
                    // Lista ranqueada: key pelas dimensões, senão a linha clicada (índice 2) desmonta quando a
                    // tabela fica só com ela (índice 0) e o foco do teclado cai no body. Todas as dimensões, não só a
                    // primeira: no cadastro (17 dimensões) um fornecedor pode ter mais de uma linha
                    key={selecionarLinha ? row.cells.slice(0, numDims).map((c) => c?.qElemNumber).join("-") || rowIndex : rowIndex}
                    data-ordem
                    data-linha-selecionavel={selecionarLinha || undefined}
                    style={{ "--ordem": rowIndex } as React.CSSProperties}
                    // Lista ranqueada: a linha entra na ordem do Tab e Enter/Espaço selecionam, como o clique
                    tabIndex={selecionarLinha ? 0 : undefined}
                    // aria-selected só vale em grid; a linha selecionada é "a atual" da lista
                    aria-current={selecionarLinha && row.cells[0]?.qState === "S" ? "true" : undefined}
                    onKeyDown={(e) => {
                      if (!selecionarLinha || e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      selecionarCelula(rowIndex, 0);
                    }}
                    className={cn(selecionarLinha && "outline-none focus-visible:[&>td]:ring-[3px] focus-visible:[&>td]:ring-inset focus-visible:[&>td]:ring-ring/70")}
                  >
                    {columnsConfig.map((_, visualIndex) => {
                      const qlikIndex = visualToDataMap[visualIndex];
                      const cell = row.cells[qlikIndex];

                      // Usa columnsConfig para determinar se é dimensão na ordem visual
                      const isDimension = columnsConfig[visualIndex]?.type === "dimension";
                      const renderizar = columnsConfig[visualIndex]?.renderizar;

                      // Só dimensões selecionam; com selecionarLinha, qualquer célula seleciona a primeira dimensão
                      const indiceSelecao = selecionarLinha ? 0 : isDimension ? qlikIndex : null;

                      return (
                        <td
                          key={visualIndex}
                          className={cn(
                            celula,
                            visualIndex === 0 && "sticky left-0 z-[10] backdrop-blur-custom",
                            cell?.qState === "S" && "RowColumn-S",
                            // Com a linha inteira como alvo, a célula não ganha o anel próprio
                            isDimension && !selecionarLinha && "sn-table-dimension-cell",
                            alinharDireita(visualIndex) ? "text-right" : "text-left",
                          )}
                          style={estiloLargura(visualIndex)}
                          onClick={() => {
                            if (indiceSelecao !== null) selecionarCelula(rowIndex, indiceSelecao);
                          }}
                        >
                          {renderizar ? (
                            renderizar(cell, row.cells)
                          ) : (
                            // 3 linhas no máximo: um texto longo fora da tela não estica a linha inteira; o texto completo fica no title.
                            // Célula selecionada mostra tudo: no toque não há title, e tocar já filtra a tabela por ela
                            <div className={cn(cell?.qState !== "S" && "line-clamp-3")} title={cell?.qText}>
                              {cell?.qText}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
        
        {isFetching && (
          // Só aparece se a busca demorar: buscas rápidas não piscam o spinner
          <div role="status" aria-label="Atualizando dados" className="absolute inset-0 bg-background/20 flex items-center justify-center z-10 animate-esmaecer [animation-delay:var(--duracao-curta)] [animation-fill-mode:backwards]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Rodapé de paginação; com uma página só, não há rodapé */}
      {totalPages > 1 && (
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2 py-2 text-sm tabular-nums">
        <div className="flex items-center gap-2">
          <span className="text-foreground md:hidden">Linhas:</span>
          <span className="text-foreground hidden md:inline">Linhas por página:</span>
          <Select
            value={rowsPerPage.toString()}
            onValueChange={handleRowsPerPageChange}
          >
            <SelectTrigger aria-label="Linhas por página" className="h-8 w-20 bg-sidebar border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-foreground md:hidden">Pág:</span>
          <span className="text-foreground hidden md:inline">Selecionar página:</span>
          {/* Itens só com a lista aberta: fechado, o Radix renderiza todos os SelectItem num fragmento para achar o
              texto do valor (424 páginas = long task de ~250 ms a cada render). O SelectValue com filho dispensa isso */}
          <Select
            open={paginasAbertas}
            onOpenChange={setPaginasAbertas}
            value={currentPageNumber.toString()}
            onValueChange={(value) => handleGoToPage(parseInt(value, 10))}
          >
            <SelectTrigger aria-label="Página" className="h-8 w-20 bg-sidebar border-input">
              <SelectValue>{currentPageNumber}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {paginasAbertas &&
                Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <SelectItem key={page} value={page.toString()}>
                    {page}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-foreground px-2 whitespace-nowrap">
          {startRow.toLocaleString("pt-BR")}–{endRow.toLocaleString("pt-BR")} de {totalRows.toLocaleString("pt-BR")}
        </div>

        <div className="my-2 flex items-center gap-1">
          {[
            { pagina: 1, rotulo: "Primeira", aria: "Primeira página", Icone: ChevronsLeft, fim: currentPageNumber === 1 },
            { pagina: currentPageNumber - 1, rotulo: "Anterior", aria: "Página anterior", Icone: ChevronLeft, fim: currentPageNumber === 1 },
            { pagina: currentPageNumber + 1, rotulo: "Próxima", aria: "Próxima página", Icone: ChevronRight, fim: currentPageNumber === totalPages },
            { pagina: totalPages, rotulo: "Última", aria: "Última página", Icone: ChevronsRight, fim: currentPageNumber === totalPages },
          ].map(({ pagina, rotulo, aria, Icone, fim }, i) => (
            <Button
              key={rotulo}
              variant="outline"
              size="sm"
              className="ml-2 flex h-9 min-w-[73px] max-[450px]:min-w-9 items-center gap-0.5 rounded-[4px] border-input bg-(--colors-custom-components-bg) px-2 text-foreground hover:bg-(--colors-custom-table-button-hover-bg) hover:text-foreground dark:bg-(--colors-custom-components-bg) dark:hover:bg-(--colors-custom-table-button-hover-bg) aria-disabled:pointer-events-none aria-disabled:opacity-50"
              // aria-disabled em vez de disabled: chegar à última página desabilitava o botão e o foco caía no body.
              // pointer-events-none corta hover e clique do mouse; o botão segue focável e o onClick guarda o teclado
              onClick={() => !(fim || isLoading) && handleGoToPage(pagina)}
              aria-disabled={fim || isLoading || undefined}
              aria-label={aria}
            >
              {/* Ícone do lado para onde a página vai */}
              {i < 2 && <Icone className="h-4 w-4" />}
              <span className="hidden min-[451px]:inline">{rotulo}</span>
              {i >= 2 && <Icone className="h-4 w-4" />}
            </Button>
          ))}
        </div>
      </div>
      )}
    </div>
  );
};