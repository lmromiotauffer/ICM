import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/shadcn/sidebar";
import Typography from "@/components/Typography/Typography";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Clock, PanelLeft } from "lucide-react";
import { routesDefinition } from "@/routes/routesDefinition";
import { SideMenuItem } from "./components/SideMenuItem/SideMenuItem";
import logoMt from "@/shared/assets/logo-mt.png";
import { Button } from "../shadcn/button";
import { ThemeToggle } from "../Header/components/ThemeToggle";

interface SideMenuProps {
  appLastUpdatedDate: {
    title: string;
    isLoading: boolean;
  };
}

export const SideMenu = ({ appLastUpdatedDate }: SideMenuProps) => {
  const { toggleSidebar, setOpenMobile, isMobile, openMobile, state } =
    useSidebar();

  const handleCloseSideMenu = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const { title, isLoading } = appLastUpdatedDate;
  const isCollapsed = !isMobile && state === "collapsed";

  const toggleControl = (
    <Button
      onClick={toggleSidebar}
      // after: 44px de toque no sheet do celular
      className="sidebar-toggle absolute top-2 left-[11px] size-9 after:absolute after:-inset-1 text-sidebar-foreground hover:text-n-active-foreground focus-visible:text-n-active-foreground rounded p-1 hover:bg-n-active focus-visible:bg-n-active"
      data-collapsed={isCollapsed}
      variant="secondary"
      size="icon"
      aria-label={isMobile ? "Fechar menu" : isCollapsed ? "Expandir menu" : "Recolher menu"}
      aria-expanded={isMobile ? openMobile : !isCollapsed}
      aria-controls="sidebar-navigation"
      title={isMobile ? "Fechar menu" : isCollapsed ? "Expandir menu" : "Recolher menu"}
    >
      <PanelLeft size={16} />
    </Button>
  );

  return (
    <Sidebar className="side-menu bg-sidebar backdrop-blur-custom text-sidebar-foreground rounded-2xl borda-vidro overflow-hidden">
      <div className="sidebar-header relative mb-4 grid shrink-0 p-2" data-collapsed={isCollapsed}>
        <div className="flex w-[calc(var(--sidebar-width)-18px)] items-center gap-2">
          <img
            src={logoMt}
            alt="Governo de Mato Grosso"
            className="sidebar-logo mx-px size-13 shrink-0 origin-top-left object-contain"
            data-collapsed={isCollapsed}
          />
          <div
            className="sidebar-label flex min-w-0 flex-1 flex-col gap-0.5 whitespace-nowrap"
            data-hidden={isCollapsed}
            aria-hidden={isCollapsed}
          >
            <Typography variant="text-base" className="pr-8 font-bold leading-6">
              Painel do ICM
            </Typography>
            <Typography variant="text-xs" className="text-muted-foreground">
              Condição da malha · SINFRA-MT
            </Typography>
          </div>
        </div>
        <div className="min-h-0 overflow-hidden" aria-hidden="true">
          <div className="h-[42px]" />
        </div>
        {toggleControl}
      </div>

      <SidebarContent className="gap-4 overflow-x-hidden px-2 py-2">
        <nav id="sidebar-navigation" aria-label="Navegação principal">
        <ul className="sidebar-navigation flex w-full min-w-0 flex-col gap-1">
          {routesDefinition.map((route) => (
            <SideMenuItem
              key={route.href}
              route={route}
              onItemClick={handleCloseSideMenu}
            />
          ))}
        </ul>
        </nav>
      </SidebarContent>

      {/* O tema mora no menu em todas as larguras: na barra de filtros ele ficava fora da tela em 1366px */}
      <div className="relative h-28 shrink-0">
        <div
          className="sidebar-label absolute bottom-4 left-[11px]"
          data-hidden={!isCollapsed}
          aria-hidden={!isCollapsed}
          inert={!isCollapsed}
        >
          <ThemeToggle compacto />
        </div>
        <div
          className="sidebar-label absolute bottom-4 left-2 flex w-[calc(var(--sidebar-width)-18px)] flex-col whitespace-nowrap"
          data-hidden={isCollapsed}
          aria-hidden={isCollapsed}
          inert={isCollapsed}
        >
          {/* Mesma grade dos itens do menu: coluna de ícone de 42px e texto alinhado aos rótulos */}
          <div className="border-sidebar-border flex flex-col gap-3 border-t pt-3">
            <div className="text-muted-foreground flex items-center">
              <span className="flex w-[42px] shrink-0 justify-center">
                <Clock size={14} />
              </span>
              {isLoading ? (
                <Skeleton className="h-4 min-w-0 flex-1" />
              ) : (
                <Typography
                  variant="text-xs"
                  className="animate-esmaecer text-muted-foreground min-w-0 flex-1 tabular-nums"
                >
                  {title}
                </Typography>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </Sidebar>
  );
};
