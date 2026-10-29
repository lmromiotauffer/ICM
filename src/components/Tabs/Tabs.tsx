import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/tailwind/cn";

interface Tab {
  label: React.ReactNode;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
}

// Controle segmentado, mesmo padrão do seletor de tema: bandeja rebaixada com uma pílula que desliza até a aba ativa
const Tabs = ({ tabs, activeTab, onTabChange, className }: TabsProps) => {
  const listaRef = useRef<HTMLDivElement>(null);
  const idBase = useId();
  const [marcador, setMarcador] = useState<{ x: number; largura: number } | null>(null);

  // Mede a aba ativa para a pílula deslizar até ela (translate + width; só este elemento relayouta).
  // Remede quando a lista muda de largura (resize, fonte carregada): a pílula ficava com a medida antiga
  useLayoutEffect(() => {
    const lista = listaRef.current;
    if (!lista) return;
    const medir = () => {
      const item = lista.querySelector<HTMLElement>("[data-ativo]");
      setMarcador(item ? { x: item.offsetLeft, largura: item.offsetWidth } : null);
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(lista);
    return () => observador.disconnect();
  }, [activeTab, tabs]);

  // Setas ← → trocam de aba e levam o foco junto (padrão WAI-ARIA de abas)
  const navegarComSetas = (evento: React.KeyboardEvent) => {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const atual = tabs.findIndex((tab) => tab.value === activeTab);
    const passo = evento.key === "ArrowRight" ? 1 : -1;
    const proximo = (atual + passo + tabs.length) % tabs.length;
    onTabChange(tabs[proximo].value);
    listaRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[proximo]?.focus();
  };

  return (
    <div
      ref={listaRef}
      role="tablist"
      onKeyDown={navegarComSetas}
      className={cn(
        // h-10 abaixo de lg: alvo de toque de 36px nas abas
        "bg-muted [.dark_&]:bg-accent relative inline-flex h-10 w-full items-center gap-0.5 rounded-md p-0.5 lg:h-8",
        className,
      )}
    >
      {marcador && (
        <span
          aria-hidden
          className="bg-n-active pointer-events-none absolute top-0.5 bottom-0.5 left-0 z-0 rounded-sm shadow-xs transition-[translate,width] duration-(--duracao-media) ease-(--ease-suave)"
          style={{ translate: `${marcador.x}px 0`, width: marcador.largura }}
        />
      )}
      {tabs.map(({ label, value }) => {
        const isActive = activeTab === value;
        return (
          <button
            key={value}
            id={`${idBase}-${value}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            data-ativo={isActive || undefined}
            className={cn(
              "relative z-10 flex h-9 flex-1 cursor-pointer lg:h-7 items-center justify-center rounded-sm px-3 text-xs font-medium whitespace-nowrap outline-none transition-[color,scale] duration-(--duracao-curta) ease-(--ease-cor) focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/70 active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100",
              isActive ? "text-n-active-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onTabChange(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
