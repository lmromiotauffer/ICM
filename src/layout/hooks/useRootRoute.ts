import { useLocation, matchPath } from "react-router-dom";
import { useEffect, useMemo } from "react";
import {
  useLastUpdateDate,
  useQlikApp,
  useQlikSelections,
  type Selection,
} from "@cluster-data-experience/qlik-modules";
import { routesDefinition } from "@/routes/routesDefinition";

const valorSelecionado = ({ qSelectedFieldSelectionInfo, qSelectedCount }: Selection): string => {
  // Todos os valores selecionados ou qSelectedFieldSelectionInfo vazio
  if (!qSelectedFieldSelectionInfo || qSelectedFieldSelectionInfo.length === 0) {
    return `Todos (${qSelectedCount})`;
  }

  const lastSelection = qSelectedFieldSelectionInfo[qSelectedFieldSelectionInfo.length - 1];
  const selectionName = lastSelection?.qName || "Selecionado";
  const additionalCount = qSelectedCount > 1 ? `, +${qSelectedCount - 1}` : "";

  return `${selectionName}${additionalCount}`;
};

export const useRootRoute = () => {
  const { app } = useQlikApp();
  const location = useLocation();
  const { items } = useQlikSelections();
  const { lastUpdateDate, isLoading } = useLastUpdateDate();

  const currentRoute = useMemo(() => {
    return routesDefinition.find((route) =>
      matchPath({ path: route.href, end: false }, location.pathname),
    );
  }, [location.pathname]);

  useEffect(() => {
    document.title = currentRoute ? `${currentRoute.label} | Painel do ICM | SINFRA-MT` : "Painel do ICM | SINFRA-MT";
  }, [currentRoute]);

  useEffect(() => {
    if (currentRoute && app) {
      app.abortModal(false);
    }
  }, [app, currentRoute, location]);

  const dataFormatada = lastUpdateDate?.parsedDate?.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    // Sem data e sem carregar: "Atualizado em ..." pareceria carregamento eterno
    lastUpdatedDate: { title: dataFormatada ? `Atualizado em ${dataFormatada}` : "Data de atualização indisponível", isLoading },
    currentRoute,
    currentSelections: items.map((selection) => ({
      valor: valorSelecionado(selection),
      field: selection.fieldName,
      limpar: () => selection.clear(),
    })),
  };
};
