import { useMemo, useState } from "react";
import type { Cell } from "@cluster-data-experience/qlik-modules";
import { Cartao, TabelaCartao } from "@/components/CartaoPainel/CartaoPainel";
import { decrescente, type ColunaTabela } from "@/components/CartaoPainel/colunas";
import { ChipCondicao, ChipResposta, LegendaFaixa } from "@/components/Escala/Escala";
import Tabs from "@/components/Tabs/Tabs";
import { useMobileScreen } from "@/shared/hooks/useMobileScreen";
import { abasTipo, questoesDoTipo, type TipoSegmento } from "@/shared/qlik/icm";

const chipCondicao = (celula: Cell) => <ChipCondicao condicao={celula?.qText ?? ""} />;
const chipResposta = (celula: Cell) => <ChipResposta resposta={celula?.qText} />;

// Uma linha por avaliação de segmento, com a resposta de cada problema em coluna (o app empilhava as questões em linhas).
// A primeira dimensão só existe para o tipo escolhido: as avaliações do outro tipo saem pela supressão de nulos
const colunas = (tipo: TipoSegmento, compacta: boolean): ColunaTabela[] => {
  const identificacao: ColunaTabela[] = [
    { type: "dimension", qFieldDefs: ["=Date(DTTEMPO)"], qFieldLabels: ["Data"], qSortCriterias: [{ qSortByNumeric: decrescente }], qNullSuppression: true, sortingPriority: 0, largura: 112 },
    { type: "dimension", qFieldDefs: ["Rodovia"], qFieldLabels: ["Rodovia"], sortingPriority: 1, largura: 100 },
    {
      type: "dimension",
      qFieldDefs: ["=Num(nuKmInicioSegmentoRodovia, '#.##0,0') & ' a ' & Num(nuKmFimSegmentoRodovia, '#.##0,0')"],
      qFieldLabels: ["Km"],
      sortingPriority: 2,
      largura: 124,
    },
    { type: "dimension", qFieldDefs: ["Avaliação condição do segmento"], qFieldLabels: ["Condição"], sortingPriority: 3, largura: 112, renderizar: chipCondicao },
  ];
  const contexto: ColunaTabela[] = [
    { type: "dimension", qFieldDefs: ["Trecho"], qFieldLabels: ["Trecho"], sortingPriority: 4, largura: 124 },
    { type: "dimension", qFieldDefs: ["Município"], qFieldLabels: ["Município"], sortingPriority: 5, largura: 150 },
    { type: "dimension", qFieldDefs: ["Avaliador"], qFieldLabels: ["Avaliador"], sortingPriority: 6, largura: 190 },
    { type: "dimension", qFieldDefs: ["cdLevantamento"], qFieldLabels: ["Levantamento"], sortingPriority: 7, largura: 136 },
    {
      type: "dimension",
      qFieldDefs: [`=If([Tipo do segmento] = '${tipo}', cdAvaliacaoSegmento)`],
      qFieldLabels: ["Nº da avaliação"],
      qNullSuppression: true,
      sortingPriority: 8,
      largura: 140,
    },
  ];
  const respostas: ColunaTabela[] = questoesDoTipo(tipo).map((questao, i) => ({
    type: "measure",
    qDef: `Only({<[_skAvaliacaoQuestao]={${questao.id}}>} [Resposta avaliação da questão])`,
    qLabel: questao.rotulo,
    sortingPriority: 9 + i,
    largura: questao.rotulo.length > 14 ? 150 : 112,
    renderizar: chipResposta,
  }));
  // No celular a condição entra nas três primeiras colunas e as respostas vêm em seguida; o contexto fica na rolagem lateral
  const [data, rodovia, km, condicao] = identificacao;
  return compacta ? [data, rodovia, condicao, km, ...respostas, ...contexto] : [...identificacao, ...contexto, ...respostas];
};

export const Trechos = () => {
  const [tipo, setTipo] = useState<TipoSegmento>("Pavimentado");
  const compacta = useMobileScreen(1024);
  const definicao = useMemo(() => colunas(tipo, compacta), [tipo, compacta]);

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <Cartao
        titulo="Avaliações por segmento"
        className="h-full min-h-0"
        acoes={<Tabs tabs={abasTipo} activeTab={tipo} onTabChange={(valor) => setTipo(valor as TipoSegmento)} className="w-auto shrink-0" />}
      >
        {(slot) => (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
              <span>Uma linha por vistoria de segmento, da mais recente para a mais antiga. Resposta de cada problema:</span>
              <LegendaFaixa />
              <span>Nenhuma = nenhuma ocorrência</span>
            </div>
            <div className="min-h-0 flex-1">
              <TabelaCartao
                // key: o conjunto de colunas muda com o tipo e a largura e o cubo precisa ser recriado
                key={`${tipo}-${compacta ? "compacta" : "completa"}`}
                colunas={definicao}
                slotExportar={slot}
                nomeArquivo={`avaliacoes-${tipo === "Pavimentado" ? "pavimentado" : "nao-pavimentado"}`}
                linhasIniciais={25}
                filtroNoCabecalho={!compacta}
                className={compacta ? "[&_td]:h-11 [&_th]:h-11" : "[&_td]:h-9 [&_th]:h-9"}
              />
            </div>
          </div>
        )}
      </Cartao>
    </div>
  );
};
