import { useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CircleCheck, CircleX, X } from "lucide-react";

type TipoAviso = "sucesso" | "erro";

interface AvisoAtual {
  texto: string;
  descricao?: string;
  tipo: TipoAviso;
  prazoMs: number;
  /** Muda a cada aviso: um aviso novo com o anterior aberto reinicia a barra de prazo. */
  id: number;
}

interface OpcoesAviso {
  tipo: TipoAviso;
  descricao?: string;
}

/** O conteúdo continua em `aviso` durante a saída, para o cartão não encolher enquanto some. */
type EstadoAviso = { aviso: AvisoAtual | null; visivel: boolean };

// Estado único fora do React: qualquer código (ex.: exportação) chama mostrarAviso sem contexto
let estado: EstadoAviso = { aviso: null, visivel: false };
const ouvintes = new Set<() => void>();
let temporizador: ReturnType<typeof setTimeout> | undefined;
let ultimoId = 0;

const definir = (parcial: Partial<EstadoAviso>) => {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((ouvinte) => ouvinte());
};

const assinar = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
};

/** Aviso curto e único, em modal (exportação concluída, falha ao exportar). */
export const mostrarAviso = (texto: string, { tipo, descricao }: OpcoesAviso) => {
  // Erro fica mais tempo: o usuário precisa entender o que falhou
  const prazoMs = tipo === "erro" ? 8000 : 5000;
  clearTimeout(temporizador);
  definir({ aviso: { texto, descricao, tipo, prazoMs, id: ++ultimoId }, visivel: true });
  temporizador = setTimeout(() => definir({ visivel: false }), prazoMs);
};

const fecharAviso = () => {
  clearTimeout(temporizador);
  definir({ visivel: false });
};

const iconePorTipo = {
  sucesso: <CircleCheck aria-hidden className="aviso-icone text-n-success size-14" />,
  erro: <CircleX aria-hidden className="aviso-icone text-destructive size-14" />,
};

export const Aviso = () => {
  const { aviso, visivel } = useSyncExternalStore(assinar, () => estado);

  return (
    <Dialog.Root open={visivel} onOpenChange={(aberto) => !aberto && fecharAviso()}>
      <Dialog.Portal>
        <Dialog.Overlay className="aviso-fundo backdrop-blur-custom fixed inset-0 z-[100] bg-black/20" />
        <Dialog.Content
          className="aviso-cartao bg-sidebar backdrop-blur-custom text-sidebar-foreground borda-vidro fixed top-1/2 left-1/2 z-[100] flex min-h-64 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center shadow-lg"
          {...(!aviso?.descricao && { "aria-describedby": undefined })}
        >
          {aviso && iconePorTipo[aviso.tipo]}
          <Dialog.Title className="text-base font-semibold">{aviso?.texto}</Dialog.Title>
          {aviso?.descricao && (
            <Dialog.Description className="text-muted-foreground text-sm">{aviso.descricao}</Dialog.Description>
          )}
          <Dialog.Close
            aria-label="Fechar aviso"
            className="text-muted-foreground hover:text-foreground transicao-feedback absolute top-3 right-3 rounded p-1 outline-none after:absolute after:-inset-2 focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-4" />
          </Dialog.Close>
          {aviso && (
            <span
              key={aviso.id}
              aria-hidden
              className="aviso-prazo bg-muted-foreground/30 absolute inset-x-6 bottom-3 h-0.5 rounded-full"
              style={{ "--prazo-aviso": `${aviso.prazoMs}ms` } as React.CSSProperties}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
