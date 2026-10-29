import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Typography from "@/components/Typography/Typography";
import { cn } from "@/shared/utils/tailwind/cn";
import { RouteDefinition } from "@/routes/routesDefinition";
import { useSidebar } from "@/components/shadcn/sidebar";
import { Button } from "@/components/shadcn/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";

interface SideMenuItemProps {
  route: RouteDefinition;
  onItemClick?: () => void;
}

export const SideMenuItem = ({ route, onItemClick }: SideMenuItemProps) => {
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = !isMobile && state === "collapsed";
  const isActive = location.pathname === route.href;

  // O ícone encena a seção quando a rota entra nela; ao montar fica parado
  const [rotaAnterior, setRotaAnterior] = useState(location.pathname);
  const [animarIcone, setAnimarIcone] = useState(false);
  if (rotaAnterior !== location.pathname) {
    setRotaAnterior(location.pathname);
    setAnimarIcone(isActive);
  }
  // O clique já destaca e anima, antes de a rota chegar
  const destacado = isActive || animarIcone;

  // Hover usa o accent do sistema (como select e busca); só a seção atual recebe o fundo cheio,
  // para o item apontado não se confundir com ela
  const toggleButtonClasses = cn(
    "group/menuitem w-full flex items-center justify-start text-sidebar-foreground hover:bg-accent hover:text-accent-foreground transicao-feedback cursor-pointer p-0 rounded overflow-hidden h-10",
    destacado && "bg-n-active hover:bg-n-active text-n-active-foreground hover:text-n-active-foreground",
  );

  const handleClick = () => {
    if (!isActive) setAnimarIcone(true);
    onItemClick?.();
    // Navega só depois de pintar o início do gesto: montar a rota (o mapa) trava a thread principal
    // por ~800ms, e o compositor só anima o que já recebeu
    requestAnimationFrame(() =>
      setTimeout(() => {
        window.scrollTo(0, 0);
        navigate(route.href);
      }),
    );
  };

  const botao = (
      <Button
        variant="secondary"
        onClick={handleClick}
        className={toggleButtonClasses}
        data-nav-active={isActive}
        aria-label={route.label}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="flex w-full items-center">
          {route.icon && (
            <span
              className={cn(
                "icone-nav flex w-[42px] items-center justify-center shrink-0",
                destacado && "text-n-active-foreground"
              )}
              data-animar={animarIcone}
            >
              {route.icon}
            </span>
          )}
          <span
            className={cn(
              "sidebar-label flex shrink-0 items-center justify-between pr-2",
              route.icon ? "w-[calc(var(--sidebar-width)-60px)]" : "min-w-0 flex-1 pl-2"
            )}
            data-hidden={isCollapsed}
            aria-hidden="true"
          >
            <Typography
              variant="text-sm"
              className={cn(
                "group-hover/menuitem:text-accent-foreground transicao-feedback font-semibold",
                destacado && "text-n-active-foreground group-hover/menuitem:text-n-active-foreground"
              )}
            >
              {route.label}
            </Typography>
          </span>
        </span>
      </Button>
  );

  // Recolhido, o rótulo some: o tooltip o devolve no hover e no foco de teclado (o title só aparecia com o mouse)
  return (
    <li className="relative list-none">
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{botao}</TooltipTrigger>
          <TooltipContent side="right">{route.label}</TooltipContent>
        </Tooltip>
      ) : (
        botao
      )}
    </li>
  );
};
