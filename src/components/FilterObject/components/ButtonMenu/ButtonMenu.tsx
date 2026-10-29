import { Button } from "@/components/shadcn/button";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/shadcn/menubar";
import Typography from "@/components/Typography/Typography";
import { Ellipsis } from "lucide-react";

type ButtonMenuProps = {
  // Fecha o filtro aplicando (true) ou desfazendo (false) as seleções feitas com ele aberto
  fechar: (aceitar: boolean) => void;
  handleSelectAll: () => void;
  handleSelectPossible: () => void;
  handleSelectAlternative: () => void;
  handleSelectExcluded: () => void;
  hasAlternative: boolean;
  hasExcluded: boolean;
  hasPossible: boolean;
  handleClear: () => void;
};

// Rodapé do filtro: ações nomeadas em texto (Limpar / Aplicar); opções avançadas ficam no "⋯"
export const ButtonMenu = ({
  fechar,
  handleSelectAll,
  handleSelectPossible,
  handleSelectAlternative,
  handleSelectExcluded,
  hasAlternative,
  hasExcluded,
  hasPossible,
  handleClear,
}: ButtonMenuProps) => (
  <footer className="flex w-full items-center gap-1 border-t border-border px-2 py-2">
    {/* Sem asChild: MenubarMenu não renderiza DOM e o menu ficava fora da ordem do Tab */}
    <Menubar className="h-auto space-x-0 border-0 bg-transparent p-0 shadow-none">
      <MenubarMenu>
        <MenubarTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 lg:size-8" title="Mais opções" aria-label="Mais opções">
            <Ellipsis className="pontinhos-onda text-muted-foreground" />
          </Button>
        </MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={handleSelectAll}>
            <Typography variant="text-sm">Selecionar todos</Typography>
          </MenubarItem>
          <MenubarItem disabled={!hasPossible} onSelect={handleSelectPossible}>
            <Typography variant="text-sm">Selecionar possíveis</Typography>
          </MenubarItem>
          <MenubarItem disabled={!hasAlternative} onSelect={handleSelectAlternative}>
            <Typography variant="text-sm">Selecionar alternativos</Typography>
          </MenubarItem>
          <MenubarItem disabled={!hasExcluded} onSelect={handleSelectExcluded}>
            <Typography variant="text-sm">Selecionar excluídos</Typography>
          </MenubarItem>
          <div className="-mx-1 my-1 h-px bg-border" role="separator" />
          <MenubarItem onSelect={() => fechar(false)}>
            <Typography variant="text-sm">Desfazer alterações</Typography>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
    <Button
      variant="ghost"
      size="sm"
      // h-9 abaixo de lg: alvo de toque de 36px, como as opções da lista
      className="ml-auto h-9 text-muted-foreground lg:h-8"
      onClick={() => {
        handleClear();
        fechar(true);
      }}
    >
      Limpar
    </Button>
    <Button size="sm" className="h-9 lg:h-8" onClick={() => fechar(true)}>
      Aplicar
    </Button>
  </footer>
);
