import { useCallback } from "react";
import { useQlikApp } from "@cluster-data-experience/qlik-modules";

/** Seleciona um ou mais valores (texto) de um campo no app; clique em barra, legenda, trecho do mapa, área visível ou resultado da busca.
 *  Devolve false quando o engine recusa (a busca mostra a mensagem) */
export const useSelecionarValor = () => {
  const { app } = useQlikApp();
  return useCallback(
    async (campo: string, valor: string | string[], alternar = false): Promise<boolean> => {
      if (!app) return false;
      try {
        const field = await app.getField(campo);
        // Campo numérico (código do segmento): o engine só casa o valor com qNumber preenchido
        const valoresCampo = (Array.isArray(valor) ? valor : [valor]).map((texto) => {
          const numero = Number(texto);
          return texto.trim() !== "" && Number.isFinite(numero) ? { qText: texto, qIsNumeric: true, qNumber: numero } : { qText: texto };
        });
        await field.selectValues(valoresCampo as EngineAPI.IFieldValue[], alternar, false);
        return true;
      } catch (erro) {
        console.error(`Não foi possível selecionar ${campo} = ${valor}`, erro);
        return false;
      }
    },
    [app],
  );
};
