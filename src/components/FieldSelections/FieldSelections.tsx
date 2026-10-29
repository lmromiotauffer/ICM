import { X } from "lucide-react";
import { useRef } from "react";
import { useQlikSelections, useQlikApp } from "@cluster-data-experience/qlik-modules";
import Typography from "../Typography/Typography";
import { mostrarAviso } from "@/components/Aviso/Aviso";

type FieldSelectionsProps = {
  field: string;
  label?: string;
};

type SelectionInfo = {
  qName: string;
};

export const FieldSelections: React.FC<FieldSelectionsProps> = ({ field, label }) => {
  const { items } = useQlikSelections();
  const { app } = useQlikApp();
  const cabecalhoRef = useRef<HTMLElement>(null);

  const item = items.find((item) => item.fieldName === field);
  const selecionados = (item?.qSelectedFieldSelectionInfo ?? []) as SelectionInfo[];
  // "Selecionar todos" devolve a lista vazia com o total: o chip "Todos (N)" abria um popover de 0 px
  const total = Number(item?.qSelectedCount ?? 0);

  const handleRemoveItem = async (qName: string) => {
    if (!app) return;
    try {
      const qlikField = await app.getField(field);
      // Texto exato em modo toggle: toggleSelect lê o texto como busca, e remover "OBRA*" desmarcava todos os "OBRA…"
      await qlikField.selectValues([{ qText: qName }], true, true);
    } catch (erro) {
      console.error("Erro ao remover valor do filtro:", erro);
      mostrarAviso("Não foi possível remover o valor", { tipo: "erro", descricao: "Tente novamente em instantes." });
    }
  };

  if (selecionados.length === 0 && total === 0) {
    return null;
  }

  return (
    <div className="border border-input bg-custom-bg-input-50 animate-esmaecer flex w-full flex-col overflow-hidden rounded-md">
      <header ref={cabecalhoRef} tabIndex={-1} className="px-3 py-2 outline-none">
        <Typography variant="text-sm" className="block">{label ?? field}</Typography>
        <Typography variant="text-xs" className="block text-muted-foreground">
          {/* O engine lista no máximo 6 valores (qSelectionThreshold): a contagem vem do total, não da lista */}
          {selecionados.length === 0
            ? `Todos os ${total.toLocaleString("pt-BR")} valores selecionados`
            : `${total.toLocaleString("pt-BR")} selecionado${total > 1 ? "s" : ""}${total > selecionados.length ? ` (mostrando ${selecionados.length})` : ""}`}
        </Typography>
      </header>
      {selecionados.length > 0 && <hr className="border-border" />}

      <div className="bg-custom-bg-input-50">
        {selecionados.map(({ qName }, index) => (
          <span
            className="text-foreground rounded-sm flex w-full px-2 py-1.5 text-sm leading-5 font-normal tracking-normal"
            key={index}
          >
            <Typography
              variant="text-xs"
              className="min-w-0 whitespace-normal wrap-anywhere"
              title={qName}
            >
              {qName}
            </Typography>
            <button
              type="button"
              aria-label={`Remover ${qName}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // O botão desmonta com o valor removido: o foco vai ao cabeçalho, senão cai no body
                cabecalhoRef.current?.focus();
                handleRemoveItem(qName);
              }}
              // before: alvo de toque de 40px sem crescer o ícone
              className="text-foreground hover:bg-accent relative ml-auto flex size-6 shrink-0 cursor-pointer items-center justify-center self-center rounded-sm outline-none transicao-feedback before:absolute before:-inset-2 focus-visible:ring-[3px] focus-visible:ring-ring/70"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};
