/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { PropsWithChildren, useEffect, useState } from "react";
import { SideMenu } from "@/components/SideMenu/SideMenu";
import { SidebarProvider, SidebarTrigger } from "@/components/shadcn/sidebar";
import { useRootRoute } from "./hooks/useRootRoute";
import { PageLoader } from "@/components/PageLoader/PageLoader";
import { useQlikApp } from "@cluster-data-experience/qlik-modules";
import { useMobileScreen } from "@/shared/hooks/useMobileScreen";
import { useParalaxeFundo } from "@/shared/hooks/useParalaxeFundo";
import { FilterPane } from "@/components/FilterPane/FilterPane";
import { FilterSheet } from "@/components/FilterSheet/FilterSheet";
import Card from "@/components/Card/components/Root/Root";
import SearchBox from "@/components/SearchBox/SearchBox";
import Typography from "@/components/Typography/Typography";
import { cn } from "@/shared/utils/tailwind/cn";
import useFetchJson from "@/shared/hooks/useFetchJson";
import { Aviso } from "@/components/Aviso/Aviso";
import { useFiltroPadrao } from "@/shared/hooks/useFiltroPadrao";
import { periodoEmContexto } from "@/shared/qlik/icm";
import { useText } from "@cluster-data-experience/qlik-modules";

export const Layout = ({ children }: PropsWithChildren) => {
  const { lastUpdatedDate, currentRoute, currentSelections } = useRootRoute();
  const { app } = useQlikApp();
  const filtroPronto = useFiltroPadrao();
  const { text: periodo } = useText(periodoEmContexto);
  // Só no npm run dev: expõe o app para validar expressões no console
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { qlikApp?: unknown }).qlikApp = app ?? undefined;
  }, [app]);

  const isMobile = useMobileScreen(1024);
  useParalaxeFundo();
  // Abaixo de 1366px o menu começa recolhido para sobrar espaço aos cartões
  const menuRecolhido = useMobileScreen(1366);
  // O loader continua montado por cima do app até terminar de esmaecer
  const [carregadorVisivel, setCarregadorVisivel] = useState(true);
  const { data: filtrosData } = useFetchJson("./pages/filtros.json");
  const filters = filtrosData?.filterpane || [];

  const carregador = carregadorVisivel && (
    <PageLoader saindo={!!app && filtroPronto} aoSair={() => setCarregadorVisivel(false)} />
  );

  // Mesma posição na árvore com e sem app: o loader não remonta ao começar a sair.
  // As páginas esperam o filtro padrão: montar antes faria cada cubo buscar duas vezes
  if (!app || !filtroPronto) return <>{null}{carregador}</>;

  return (
    <>
    <div
      className={cn(
        // h-dvh: no celular 100vh inclui a área sob a barra do navegador e escondia o rodapé
        "relative z-10 flex h-dvh w-screen overflow-hidden",
      )}
    >
      <SidebarProvider defaultOpen={!menuRecolhido}>
        <div className="relative z-10 flex h-full w-full gap-2">
          <div className="flex h-full w-full">
            <div className="pointer-events-auto">
              <SideMenu appLastUpdatedDate={lastUpdatedDate} />
            </div>

            <div className={cn("flex h-full flex-1 flex-col gap-2 overflow-hidden", isMobile ? "p-0" : "pl-2")}>
              <div className={cn("flex h-full flex-1 flex-col gap-2 overflow-hidden", isMobile ? "p-0" : "p-2")}>
                {!isMobile && filters.length > 0 && (
                  <Card className="pointer-events-auto min-h-8 w-full shrink-0 p-0 px-4">
                    <FilterPane filters={filters} selections={currentSelections} />
                  </Card>
                )}

                <div
                  className={cn("flex h-full w-full flex-1 flex-col overflow-hidden", {
                    "pt-14": isMobile,
                  })}
                >
                  <div className="flex h-full w-full overflow-hidden">
                    {/* main só no conteúdo da página: menu e filtros ficam fora do marco principal */}
                    <main className="flex h-full flex-1 flex-col overflow-hidden">
                      {currentRoute && (
                        <header
                          className="@container group pointer-events-auto relative mb-2 flex w-full shrink-0 items-start justify-between"
                        >
                          <div
                            className={cn(
                              "flex flex-col gap-1 ease-suave transition-[padding] duration-(--duracao-media) motion-reduce:transition-none group-has-[[data-expandida=true]]:pt-14",
                              isMobile ? "max-w-full px-4 pt-4" : "max-w-[60%] px-4 pb-2 pt-6"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {currentRoute.icon && (
                                <div className="text-secondary-foreground">
                                  {React.cloneElement(
                                    currentRoute.icon as React.ReactElement<any>,
                                    {
                                      size: isMobile ? 20 : 24,
                                    }
                                  )}
                                </div>
                              )}

                              <Typography
                                variant={isMobile ? "text-lg" : "text-2xl"}
                                className="font-semibold text-secondary-foreground"
                              >
                                {currentRoute.label}
                              </Typography>
                            </div>

                            {currentRoute.description && (
                              <Typography
                                variant={isMobile ? "text-2xs" : "text-sm"}
                                className={cn(
                                  "leading-relaxed text-secondary-foreground",
                                  isMobile && "line-clamp-2 max-h-[33px] overflow-hidden"
                                )}
                              >
                                {currentRoute.description}
                              </Typography>
                            )}
                            {/* O período em contexto em linha própria: os números da página são dele e ele não pode ser cortado pelo clamp */}
                            {periodo && (
                              <Typography variant="text-2xs" className="animate-esmaecer text-muted-foreground">
                                Período: {periodo}
                              </Typography>
                            )}
                          </div>

                          <div className={cn("flex shrink-0 items-start pr-2", isMobile && "pt-4")}>
                            {/* Slot para ações da página (ex.: exportar), preenchido via portal pelo CustomTable */}
                            <div
                              id="acoes-cabecalho"
                              className="ease-suave transition-opacity duration-(--duracao-media) motion-reduce:transition-none group-has-[[data-expandida=true]]:pointer-events-none group-has-[[data-expandida=true]]:opacity-0"
                            />
                            {!isMobile && (
                              <div className="flex w-[300px] justify-end @max-[36rem]:w-[208px] xl:w-[380px]">
                                <SearchBox filters={filters} />
                              </div>
                            )}
                          </div>
                        </header>
                      )}

                      <div className={cn(
                        "relative h-full w-full flex-1 overflow-hidden",
                        isMobile && "px-2 pt-4 mb-2"
                      )}>
                        {children}
                      </div>
                    </main>
                  </div>
                </div>
              </div>
              {isMobile && (
                <div className="pointer-events-auto absolute left-2 right-2 top-4 z-50 flex items-center gap-2 py-2">
                  <SidebarTrigger className="shrink-0 text-foreground" />
                  <div className="min-w-0 flex-1">
                    <SearchBox isMobile filters={filters} />
                  </div>
                  {filters.length > 0 && (
                    <div className="shrink-0">
                      <FilterSheet
                        filters={filters}
                        fieldsWithSelections={currentSelections.map((s) => s.field)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarProvider>
      <Aviso />
    </div>
    {carregador}
    </>
  );
};

export default Layout;
