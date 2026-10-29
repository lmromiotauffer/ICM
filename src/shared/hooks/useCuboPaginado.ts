import { useEffect, useState } from "react";
import { useQlikApp, type Cell } from "@cluster-data-experience/qlik-modules";

export type DimensaoCubo =
  | string
  | {
      campo: string;
      // "numero" ordena pelo valor numérico; "expressao" pela expressão em `expressaoOrdem`; sem nada, pelo texto
      ordenarPor?: "numero" | "texto" | "expressao";
      expressaoOrdem?: string;
      decrescente?: boolean;
    };

export type MedidaCubo = string | { expressao: string; decrescente?: boolean };

type Parametros = {
  dimensoes: DimensaoCubo[];
  medidas?: MedidaCubo[];
  // Índices das colunas (dimensões e depois medidas) na ordem de classificação; sem isso, a ordem das colunas
  ordem?: number[];
  // Linhas no máximo: além disso o resultado fica truncado e a página avisa
  maxLinhas?: number;
  suprimirZero?: boolean;
  // Sem app ou com `ativo: false` o cubo não é criado (camada do mapa desligada)
  ativo?: boolean;
};

// O objeto do enigma traz id e eventos que a tipagem do engine não declara
type ObjetoEnigma = EngineAPI.IGenericObject & { id: string; on: (evento: string, ouvinte: () => void) => void; removeAllListeners: () => void };

const sentido = (decrescente?: boolean) => (decrescente ? -1 : 1);

const definirDimensao = (dimensao: DimensaoCubo) => {
  const d = typeof dimensao === "string" ? { campo: dimensao } : dimensao;
  const criterio: Record<string, unknown> =
    d.ordenarPor === "numero"
      ? { qSortByNumeric: sentido(d.decrescente) }
      : d.ordenarPor === "expressao"
        ? { qSortByExpression: sentido(d.decrescente), qExpression: { qv: d.expressaoOrdem } }
        : { qSortByAscii: sentido(d.decrescente) };
  return { qDef: { qFieldDefs: [d.campo], qSortCriterias: [criterio] }, qNullSuppression: true };
};

const definirMedida = (medida: MedidaCubo) => {
  const m = typeof medida === "string" ? { expressao: medida } : medida;
  return { qDef: { qDef: m.expressao }, qSortBy: { qSortByNumeric: sentido(m.decrescente) } };
};

/**
 * Hipercubo completo (várias páginas) que acompanha as seleções do app. Para o mapa e os gráficos,
 * que precisam de todas as linhas de uma vez: o useTable da lib pagina para a tabela.
 * ponytail: refaz a busca inteira a cada mudança de seleção; cache por página se o engine ficar lento
 */
export const useCuboPaginado = ({ dimensoes, medidas = [], ordem, maxLinhas = 30000, suprimirZero, ativo = true }: Parametros) => {
  const { app } = useQlikApp();
  // O resultado guarda a chave que o gerou: com parâmetros novos as linhas antigas não valem
  // (ex.: médias do pavimentado sob os rótulos do não pavimentado até a busca nova chegar)
  const [resultado, setResultado] = useState<{ chave: string; linhas: Cell[][] | null; total: number } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const chave = JSON.stringify({ dimensoes, medidas, ordem, maxLinhas, suprimirZero, ativo });

  useEffect(() => {
    if (!app || !ativo) {
      setCarregando(ativo);
      return;
    }
    let vivo = true;
    let objeto: ObjetoEnigma | null = null;
    // Uma seleção no meio da paginação dispara outro "changed": só a busca mais recente pode gravar,
    // senão as páginas antigas (já com os dados novos) se misturam às novas
    let geracao = 0;
    const largura = dimensoes.length + medidas.length;
    // O engine limita cada página a 10.000 células
    const linhasPorPagina = Math.max(1, Math.floor(10000 / largura));
    // Falha numa atualização mantém as linhas desta chave; falha na primeira busca encerra o carregamento sem linhas
    const falhou = () => {
      setResultado((anterior) => (anterior?.chave === chave ? anterior : { chave, linhas: null, total: 0 }));
      setCarregando(false);
    };

    const buscar = async () => {
      if (!objeto) return;
      const minha = ++geracao;
      const atual = () => vivo && minha === geracao;
      setCarregando(true);
      try {
        const layout = (await objeto.getLayout()) as unknown as { qHyperCube: { qSize: { qcy: number } } };
        if (!atual()) return;
        const quantidade = layout.qHyperCube.qSize.qcy;
        const limite = Math.min(quantidade, maxLinhas);
        const paginas: EngineAPI.INxPage[] = [];
        for (let topo = 0; topo < limite; topo += linhasPorPagina) {
          paginas.push({ qTop: topo, qLeft: 0, qHeight: Math.min(linhasPorPagina, limite - topo), qWidth: largura });
        }
        // Uma página por chamada: várias de uma vez estouram o limite de resposta do engine ("Result too large")
        const acumulado: Cell[][] = [];
        for (const pagina of paginas) {
          const [dados] = await objeto.getHyperCubeData("/qHyperCubeDef", [pagina]);
          if (!atual()) return;
          acumulado.push(...(dados.qMatrix as unknown as Cell[][]));
        }
        setResultado({ chave, linhas: acumulado, total: quantidade });
        setCarregando(false);
      } catch (erro) {
        console.error("Cubo paginado:", erro);
        if (atual()) falhou();
      }
    };

    app
      .createSessionObject({
        qInfo: { qType: "cubo-paginado" },
        qHyperCubeDef: {
          qDimensions: dimensoes.map(definirDimensao),
          qMeasures: medidas.map(definirMedida),
          qInterColumnSortOrder: ordem,
          qSuppressZero: suprimirZero,
          qInitialDataFetch: [],
        },
      } as unknown as EngineAPI.IGenericObjectProperties)
      .then((criado) => {
        const novo = criado as unknown as ObjetoEnigma;
        if (!vivo) {
          app.destroySessionObject(novo.id);
          return;
        }
        objeto = novo;
        objeto.on("changed", buscar);
        return buscar();
      })
      .catch((erro) => {
        console.error("Cubo paginado:", erro);
        if (vivo) falhou();
      });

    return () => {
      vivo = false;
      if (objeto) {
        objeto.removeAllListeners();
        app.destroySessionObject(objeto.id).catch(() => undefined);
      }
    };
    // chave resume todos os parâmetros
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, chave]);

  const atual = resultado?.chave === chave ? resultado : null;
  const total = atual?.total ?? 0;
  // Sem resultado da chave atual ainda está carregando: o efeito só marca carregando depois de criar o objeto
  return { linhas: atual?.linhas ?? null, total, carregando: carregando || (ativo && !atual), truncado: total > maxLinhas };
};

/** Valor numérico de uma célula de cubo ou de KPI; nulo quando o engine não calculou */
export const numero = (celula: { qNum?: unknown } | undefined): number | null => (celula && typeof celula.qNum === "number" && Number.isFinite(celula.qNum) ? celula.qNum : null);
