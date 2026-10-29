import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { Button } from "@/components/shadcn/button";
import { RotateCw } from "lucide-react";
import { useState } from "react";

export const DisconnectionDialog = ({
  disconnected,
}: {
  disconnected: boolean;
}) => {
  const [recarregando, setRecarregando] = useState(false);
  return (
    <AlertDialog open={disconnected}>
      {/* O Radix só foca AlertDialogCancel, que não existe aqui: sem isto o foco ficava preso na página escondida */}
      <AlertDialogContent
        onOpenAutoFocus={(e) => (e.currentTarget as HTMLElement).querySelector("button")?.focus()}
        className="bg-card backdrop-blur-custom rounded-2xl text-foreground"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Erro de conexão</AlertDialogTitle>
          <AlertDialogDescription>
            A conexão com o servidor caiu. Recarregue a página para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            size="sm"
            onClick={() => {
              setRecarregando(true);
              window.location.reload();
            }}
            className="active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100"
          >
            <RotateCw className="icone-recarregar" data-girando={recarregando} />
            Recarregar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
