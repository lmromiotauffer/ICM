import { useEffect, useState } from "react";
import { useQlikApp } from "@cluster-data-experience/qlik-modules";
import { ultimosMeses } from "@/shared/qlik/icm";

const MESES = 4;

/**
 * Sem filtro de ano/mês o painel misturaria 24 meses e "onde está pior" ficaria velho.
 * A cada sessão nova do engine (abertura da aba, reconexão) sem ano/mês selecionado, seleciona os últimos 4 meses
 * com dados, como o filtro padrão do app. Limpar os filtros depois é uma escolha do visitante e fica valendo:
 * o efeito só roda de novo quando o app troca.
 * Devolve `pronto` para as páginas só montarem depois da seleção: senão cada visitante busca tudo duas vezes.
 */
export const useFiltroPadrao = () => {
  const { app } = useQlikApp();
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    if (!app) return;
    (async () => {
      try {
        const selecionados = Number(await app.evaluate("GetSelectedCount([Ano/Mês])"));
        if (selecionados > 0) return;
        const lista = String(await app.evaluate("Concat(distinct Aggr(Only(NUANOMES) & '=' & Only([Ano/Mês]), NUANOMES), ';')"));
        const ultimos = ultimosMeses(lista, MESES);
        if (ultimos.length === 0) return;
        const campo = await app.getField("Ano/Mês");
        await campo.selectValues(ultimos, false, false);
      } catch (erro) {
        console.error("Filtro padrão de ano/mês:", erro);
      } finally {
        setPronto(true);
      }
    })();
  }, [app]);
  return pronto;
};
