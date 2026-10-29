import { useQlikApp } from "@cluster-data-experience/qlik-modules";
import { useEffect, useState } from "react";
import { useSelecionarValor } from "./useSelecionarValor";

export interface SimplifiedSearchResultItem {
  text: string;
  field: string;
}

// Última resposta do engine com o termo que a gerou: enquanto o termo não casa com `search`, a busca está em andamento
type Resposta = { termo: string; results: SimplifiedSearchResultItem[]; error: string | null };

const qOptions = {
  qContext: "CurrentSelections",
  qCharEncoding: "Utf16",
} as EngineAPI.ISearchCombinationOptions;

const qPage = {
  qOffset: 0,
  qCount: 5,
  qGroupOptions: [{ qGroupType: "DatasetType", qOffset: 0, qCount: -1 }],
  qGroupItemOptions: [{ qGroupItemType: "Field", qOffset: 0, qCount: 5 }],
} as unknown as EngineAPI.ISearchPage;

const useQlikSearch = () => {
  const { app } = useQlikApp();
  const selecionar = useSelecionarValor();
  const [search, setBusca] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [erroSelecao, setErroSelecao] = useState<string | null>(null);

  const setSearch = (valor: string) => {
    setErroSelecao(null);
    setBusca(valor);
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (!app || !debouncedSearch) return;
    // Descarta respostas de buscas já substituídas
    let ativo = true;
    app
      .searchResults(qOptions, [debouncedSearch], qPage)
      .then((qlikResult) => {
        if (!ativo) return;
        // @types/qlik-engineapi tipa qSearchGroupArray como objeto; o engine devolve array
        const groups = (qlikResult.qSearchGroupArray || []) as unknown as EngineAPI.ISearchGroup[];
        const results = groups.flatMap((group) =>
          group.qItems.flatMap((item) =>
            item.qItemMatches.map((match) => ({
              text: match.qText || "N/A: qText not found",
              field: item.qIdentifier || "Field N/A",
            })),
          ),
        );
        setResposta({ termo: debouncedSearch, results, error: null });
      })
      .catch((err) => {
        if (!ativo) return;
        console.error("Erro ao buscar resultados:", err);
        setResposta({ termo: debouncedSearch, results: [], error: "Erro ao buscar resultados" });
      });
    return () => {
      ativo = false;
    };
  }, [app, debouncedSearch]);

  const atual = search && resposta?.termo === search ? resposta : null;

  // Mesma seleção dos cliques no painel: trata campo numérico (código do segmento) e devolve se o engine aceitou
  const applySelection = async (item: SimplifiedSearchResultItem) => {
    if (await selecionar(item.field, item.text)) {
      setSearch("");
      return true;
    }
    setErroSelecao("Não foi possível aplicar o filtro. Tente de novo.");
    return false;
  };

  return {
    search,
    setSearch,
    isSearching: !!search && !atual,
    error: erroSelecao ?? atual?.error ?? null,
    results: atual?.results ?? [],
    applySelection,
  };
};

export { useQlikSearch };
