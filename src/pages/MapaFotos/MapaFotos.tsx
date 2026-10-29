import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useGenericKPI, useQlikSelections, type KPIParams } from "@cluster-data-experience/qlik-modules";
import { mostrarAviso } from "@/components/Aviso/Aviso";
import { Cartao } from "@/components/CartaoPainel/CartaoPainel";
import { ChipCondicao, ChipResposta, LegendaCondicao } from "@/components/Escala/Escala";
import { MapaMalha, type FotoMapa, type ObraMapa, type SegmentoMapa } from "@/components/Mapa/MapaMalha";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select";
import { Skeleton } from "@/components/shadcn/skeleton";
import { numero, useCuboPaginado, type DimensaoCubo } from "@/shared/hooks/useCuboPaginado";
import { useSelecionarValor } from "@/shared/hooks/useSelecionarValor";
import { condicaoMaisRecente, condicoes, dataPorExtenso, formatarKm, kmAvaliado, lerGeometria, lerPonto, questoes, questoesDoTipo, setCondicao, type TipoSegmento } from "@/shared/qlik/icm";
import { baixarArquivo } from "@/shared/utils/baixarArquivo";
import { cn } from "@/shared/utils/tailwind/cn";
import { baixarFotos, LIMITE_DOWNLOAD } from "./baixarFotos";

const LIMITE_SEGMENTOS = 30000;
const LIMITE_FOTOS = 300;
const dataVistoria: DimensaoCubo = { campo: "=Date(DTTEMPO)", ordenarPor: "numero", decrescente: true };
const kmInicioFim = "=Num(nuKmInicioSegmentoRodovia, '#.##0,0') & ' a ' & Num(nuKmFimSegmentoRodovia, '#.##0,0')";

const kpisLegenda: KPIParams[] = condicoes.map((condicao) => ({ label: condicao, expression: `Num(${kmAvaliado(setCondicao([condicao]))}, '#.##0')` }));

/** Segmento selecionado no Qlik (um só), que é o detalhe do painel */
const useSegmentoSelecionado = () => {
  const { items } = useQlikSelections();
  const selecao = items.find(({ fieldName, qSelectedCount }) => fieldName === "cdSegmentoRodovia" && qSelectedCount === 1);
  return { id: selecao?.qSelectedFieldSelectionInfo?.[0]?.qName ?? null, limpar: () => selecao?.clear() };
};

type Foto = { id: string; ponto: [number, number] | null; url: string; segmento: string; rodovia: string; municipio: string; comentario: string; data: string; condicao: string; trecho: string };

const passosSeta: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

/** Visualizador fixo no topo e só as miniaturas rolam: trocar de foto nunca tira a grande de vista. children abre o rolo (intro ou detalhe do segmento) */
const Galeria = ({ fotos, carregando, total, aberta, abrir, children }: { fotos: Foto[]; carregando: boolean; total: number; aberta: Foto | null; abrir: (id: string) => void; children: ReactNode }) => {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [baixando, setBaixando] = useState<{ feitas: number; total: number } | null>(null);
  const rolo = useRef<HTMLDivElement>(null);
  const indice = aberta ? fotos.findIndex((foto) => foto.id === aberta.id) : -1;
  const irPara = (passo: number) => {
    const foto = fotos[indice + passo];
    if (foto) abrir(foto.id);
  };
  // A miniatura da foto aberta acompanha as setas, o mapa e o salto de data; só quando o rolo é interno (no celular a página rola)
  useEffect(() => {
    const alvo = rolo.current;
    if (alvo && alvo.scrollHeight > alvo.clientHeight) alvo.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest" });
  }, [aberta?.id]);
  // Derivada da lista atual: ao trocar o filtro, fotos que saíram deixam de contar (e somem do estado na próxima marcação)
  const selecionadas = fotos.filter((foto) => marcadas.includes(foto.id));
  const idsSelecionados = selecionadas.map((foto) => foto.id);
  const limiteAtingido = selecionadas.length >= LIMITE_DOWNLOAD;
  // O cubo já vem por data decrescente: a ordem de inserção deixa o dia mais recente primeiro
  const porData = [...fotos.reduce((grupos, foto) => grupos.set(foto.data, [...(grupos.get(foto.data) ?? []), foto]), new Map<string, Foto[]>())];

  const alternarGrupo = (ids: string[]) => {
    const todasMarcadas = ids.every((id) => idsSelecionados.includes(id));
    setMarcadas(todasMarcadas ? idsSelecionados.filter((id) => !ids.includes(id)) : [...new Set([...idsSelecionados, ...ids])].slice(0, LIMITE_DOWNLOAD));
  };

  const baixar = async () => {
    setBaixando({ feitas: 0, total: selecionadas.length });
    try {
      const { arquivo, nome, falhas } = await baixarFotos(selecionadas, (feitas) => setBaixando({ feitas, total: selecionadas.length }));
      if (arquivo) baixarArquivo(arquivo, nome);
      if (falhas) mostrarAviso(arquivo ? `${falhas} foto${falhas === 1 ? " não pôde ser baixada" : "s não puderam ser baixadas"}` : "Nenhuma foto pôde ser baixada", { tipo: "erro" });
    } finally {
      setBaixando(null);
    }
  };

  if (fotos.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {children}
        {carregando ? <Skeleton className="h-48 w-full rounded-lg bg-muted" /> : <p className="text-xs text-muted-foreground">Nenhuma foto para os filtros atuais.</p>}
      </div>
    );
  }
  return (
    <div
      className="flex h-full min-h-0 flex-col gap-2"
      // Setas do teclado trocam a foto a partir de qualquer controle da galeria
      onKeyDown={(evento) => {
        const passo = passosSeta[evento.key];
        if (!passo) return;
        evento.preventDefault();
        irPara(passo);
      }}
    >
      {aberta && (
        // key: trocar de miniatura remonta a figura e a nova foto entra por esmaecimento, sem estalo
        <figure key={aberta.id} className="animate-esmaecer flex shrink-0 flex-col gap-1.5">
          <img src={aberta.url} alt={`Foto da vistoria em ${aberta.rodovia}, ${aberta.municipio}, ${aberta.data}`} className="aspect-[4/3] w-full rounded-md border border-border object-cover lg:max-h-[38dvh]" />
          <figcaption className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="text-foreground">{aberta.data}</span>
            <span>{aberta.rodovia}</span>
            <span>{aberta.municipio}</span>
            <ChipCondicao condicao={aberta.condicao} />
            {aberta.comentario && aberta.comentario.toLowerCase() !== "em branco" && <span className="basis-full text-foreground">“{aberta.comentario}”</span>}
          </figcaption>
        </figure>
      )}
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="outline" size="icon" aria-label="Foto anterior" onClick={() => irPara(-1)} disabled={indice <= 0} className="size-8 border-input bg-sidebar text-foreground">
          <ChevronLeft aria-hidden />
        </Button>
        <Button variant="outline" size="icon" aria-label="Próxima foto" onClick={() => irPara(1)} disabled={indice < 0 || indice >= fotos.length - 1} className="size-8 border-input bg-sidebar text-foreground">
          <ChevronRight aria-hidden />
        </Button>
        <span aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
          {indice + 1} de {fotos.length}
        </span>
        <Select
          value={aberta?.data}
          onValueChange={(data) => {
            const foto = porData.find(([dia]) => dia === data)?.[1][0];
            if (foto) abrir(foto.id);
          }}
        >
          <SelectTrigger size="sm" aria-label="Ir para a data" className="ml-auto border-input bg-sidebar text-xs tabular-nums">
            <SelectValue>{aberta?.data}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* Radix recusa value vazio: foto sem data fica fora do salto, mas segue na grade */}
            {porData.filter(([data]) => data).map(([data, grupo]) => (
              <SelectItem key={data} value={data}>
                {dataPorExtenso(data)} · {grupo.length}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div ref={rolo} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {children}
        {porData.map(([data, grupo]) => {
          const ids = grupo.map((foto) => foto.id);
          const grupoMarcado = ids.every((id) => idsSelecionados.includes(id));
          return (
            <section key={data} aria-label={`Fotos de ${data}`} className="flex flex-col gap-1.5">
              {/* Fixo no topo do rolo das miniaturas; z acima das caixas de seleção absolutas das miniaturas */}
              <h4 className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-card py-1 text-xs">
                <span className="font-medium text-foreground">{dataPorExtenso(data)}</span>
                <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
                  {grupo.length} foto{grupo.length === 1 ? "" : "s"}
                  <button
                    type="button"
                    onClick={() => alternarGrupo(ids)}
                    disabled={!grupoMarcado && limiteAtingido}
                    className="cursor-pointer font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {grupoMarcado ? "Desmarcar" : "Selecionar"}
                  </button>
                </span>
              </h4>
              <ul className="grid grid-cols-4 gap-1.5" aria-label={`Miniaturas das fotos de ${data}`}>
                {grupo.map((foto) => {
                  const marcada = idsSelecionados.includes(foto.id);
                  return (
                    <li key={foto.id} className="relative">
                      <button
                        type="button"
                        onClick={() => abrir(foto.id)}
                        aria-pressed={aberta?.id === foto.id}
                        aria-label={`Abrir foto de ${foto.data} em ${foto.rodovia}`}
                        className={cn(
                          // scroll-mt: ao rolar até a miniatura, ela para abaixo do cabeçalho de data fixo (h4 de 24px)
                          "block aspect-square w-full scroll-mt-7 cursor-pointer overflow-hidden rounded-sm border border-border bg-muted transition-[box-shadow,opacity,scale] duration-(--duracao-curta) ease-(--ease-cor) hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100",
                          marcada && "border-2 border-foreground",
                          aberta?.id === foto.id && "ring-2 ring-primary",
                        )}
                      >
                        <img src={foto.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      </button>
                      <Checkbox
                        checked={marcada}
                        disabled={!marcada && limiteAtingido}
                        onCheckedChange={(valor) => setMarcadas(valor === true ? [...idsSelecionados, foto.id] : idsSelecionados.filter((id) => id !== foto.id))}
                        aria-label={`Selecionar foto de ${foto.data} em ${foto.rodovia} para baixar`}
                        className="absolute left-1 top-1 bg-sidebar shadow-sm after:absolute after:-inset-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <p className="text-[11px] text-muted-foreground">
          {total > fotos.length ? `As ${fotos.length} fotos mais recentes de ${total.toLocaleString("pt-BR")}; filtre um trecho ou uma data para ver as outras.` : `${fotos.length} foto${fotos.length === 1 ? "" : "s"}.`}
        </p>
      </div>
      {/* Barra de seleção: contagem, Limpar e Baixar só aparecem quando há foto marcada */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border pt-2">
        <Button variant="outline" size="sm" onClick={() => setMarcadas(fotos.slice(0, LIMITE_DOWNLOAD).map((foto) => foto.id))} className="border-input bg-sidebar text-foreground">
          {fotos.length > LIMITE_DOWNLOAD ? `Selecionar as ${LIMITE_DOWNLOAD} primeiras` : "Selecionar todas"}
        </Button>
        {selecionadas.length > 0 && (
          <>
            <span className="text-xs tabular-nums text-foreground">
              {selecionadas.length} selecionada{selecionadas.length === 1 ? "" : "s"}
              {limiteAtingido && <span className="text-muted-foreground"> · limite por download</span>}
            </span>
            <Button variant="outline" size="sm" onClick={() => setMarcadas([])} disabled={baixando !== null} className="ml-auto border-input bg-sidebar text-foreground">
              Limpar
            </Button>
            <Button variant="outline" size="sm" onClick={() => void baixar()} disabled={baixando !== null} className="border-input bg-sidebar text-foreground">
              {baixando ? `Baixando ${baixando.feitas} de ${baixando.total}…` : "Baixar"}
            </Button>
          </>
        )}
      </div>
      <span role="status" className="sr-only">{baixando ? `Baixando ${baixando.feitas} de ${baixando.total} fotos` : ""}</span>
    </div>
  );
};

/** Última avaliação do segmento selecionado: condição, data, avaliador e a resposta de cada problema */
const DetalheSegmento = ({ id }: { id: string }) => {
  const { linhas, carregando } = useCuboPaginado({
    dimensoes: ["cdAvaliacaoSegmento", dataVistoria, "Avaliador", "Município", "Avaliação condição do segmento", "Tipo do segmento", "Rodovia", "Trecho", kmInicioFim],
    medidas: questoes.map((questao) => `Only({<[_skAvaliacaoQuestao]={${questao.id}}>} [Resposta avaliação da questão])`),
    ordem: [1, 0],
    maxLinhas: 1,
    ativo: !!id,
  });
  const linha = linhas?.[0];
  if (!linha) return carregando ? <Skeleton className="h-40 w-full rounded-lg bg-muted" /> : <p className="text-xs text-muted-foreground">Sem avaliação deste segmento nos filtros atuais.</p>;
  const [, data, avaliador, municipio, condicao, tipo, rodovia, trecho, km] = linha.map((celula) => celula?.qText ?? "");
  const lista = questoesDoTipo((tipo as TipoSegmento) || "Pavimentado");
  return (
    <div className="animate-esmaecer flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight text-foreground">
            {rodovia} <span className="text-muted-foreground">·</span> {trecho}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            km {km} · {municipio}
          </p>
        </div>
        <ChipCondicao condicao={condicao} className="h-6 px-2.5 text-xs" />
      </div>
      <p className="text-xs text-muted-foreground">
        Vistoria de <span className="text-foreground">{data}</span> por <span className="text-foreground">{avaliador}</span> · {tipo}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {lista.map((questao) => {
          const indice = 9 + questoes.indexOf(questao);
          return (
            <div key={questao.id} className="flex items-center justify-between gap-2 border-b border-border py-1">
              <dt className="min-w-0 break-words text-muted-foreground">{questao.rotulo}</dt>
              <dd className="shrink-0"><ChipResposta resposta={linha[indice]?.qText} /></dd>
            </div>
          );
        })}
      </dl>
      <Link
        to="/trechos"
        className="inline-flex items-center gap-1 self-start rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Ver todas as avaliações deste segmento
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
};

export const MapaFotos = () => {
  const [verObras, setVerObras] = useState(false);
  const [verFotos, setVerFotos] = useState(true);
  const [verLimites, setVerLimites] = useState(true);
  const [fotoAberta, setFotoAberta] = useState<string | null>(null);
  const selecionar = useSelecionarValor();
  const { id: selecionado, limpar } = useSegmentoSelecionado();

  const segmentosCubo = useCuboPaginado({
    dimensoes: ["cdSegmentoRodovia", "geoPercursoSegmento", "Rodovia", "Trecho"],
    medidas: [condicaoMaisRecente, "Num(Min(nuKmInicioSegmentoRodovia), '#.##0,0')", "Num(Max(nuKmFimSegmentoRodovia), '#.##0,0')"],
    maxLinhas: LIMITE_SEGMENTOS,
  });
  // As geometrias das obras pesam (até 40 KB cada): só chegam com a camada ligada
  const obrasCubo = useCuboPaginado({ dimensoes: ["_skObra", "geoObra", "cdContrato", "deLote"], maxLinhas: 400, ativo: verObras });
  const fotosCubo = useCuboPaginado({
    dimensoes: ["_skFoto", "localFotoIcm", "urlfoto", "cdSegmentoRodovia", "Rodovia", "Município", "deComentarioFoto", dataVistoria, "Avaliação condição do segmento", "Trecho"],
    ordem: [7, 0],
    maxLinhas: LIMITE_FOTOS,
  });
  const { data: kmsLegenda } = useGenericKPI(kpisLegenda);

  const segmentos = useMemo<SegmentoMapa[]>(
    () =>
      (segmentosCubo.linhas ?? []).map(([id, geo, rodovia, trecho, condicao, kmInicio, kmFim]) => ({
        id: id?.qText ?? "",
        caminho: lerGeometria(geo?.qText),
        rodovia: rodovia?.qText ?? "",
        trecho: trecho?.qText ?? "",
        condicao: condicao?.qText ?? "",
        kmInicio: kmInicio?.qText ?? "",
        kmFim: kmFim?.qText ?? "",
      })),
    [segmentosCubo.linhas],
  );
  const obras = useMemo<ObraMapa[]>(
    () => (obrasCubo.linhas ?? []).map(([, geo, contrato, descricao]) => ({ caminho: lerGeometria(geo?.qText), contrato: contrato?.qText ?? "", descricao: descricao?.qText ?? "" })),
    [obrasCubo.linhas],
  );
  const fotos = useMemo<Foto[]>(
    () =>
      (fotosCubo.linhas ?? []).map(([id, ponto, url, segmento, rodovia, municipio, comentario, data, condicao, trecho]) => ({
        id: id?.qText ?? "",
        ponto: lerPonto(ponto?.qText),
        url: url?.qText ?? "",
        segmento: segmento?.qText ?? "",
        rodovia: rodovia?.qText ?? "",
        municipio: municipio?.qText ?? "",
        comentario: comentario?.qText ?? "",
        data: data?.qText ?? "",
        condicao: condicao?.qText ?? "",
        trecho: trecho?.qText ?? "",
      })),
    [fotosCubo.linhas],
  );
  const fotosNoMapa = useMemo<FotoMapa[]>(
    () => (verFotos ? fotos.filter((foto): foto is Foto & { ponto: [number, number] } => foto.ponto !== null).map(({ id, ponto, rodovia, data }) => ({ id, ponto, rodovia, data })) : []),
    [fotos, verFotos],
  );

  // A foto aberta precisa existir na lista atual; ao trocar de trecho, abre a mais recente
  const aberta = fotos.find((foto) => foto.id === fotoAberta) ?? fotos[0] ?? null;
  useEffect(() => {
    if (fotoAberta && !fotos.some((foto) => foto.id === fotoAberta)) setFotoAberta(null);
  }, [fotos, fotoAberta]);

  const kms = condicoes.map((_, i) => numero(kmsLegenda?.[i]) ?? 0);
  const totalKm = kms.reduce((soma, km) => soma + km, 0);

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto lg:flex-row lg:overflow-hidden">
      <Cartao
        titulo="Segmentos avaliados no mapa"
        className="h-[560px] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1"
        acoes={
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={verObras} onCheckedChange={(valor) => setVerObras(valor === true)} />
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-primary/35" aria-hidden />
                Obras em garantia
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={verFotos} onCheckedChange={(valor) => setVerFotos(valor === true)} />
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border-2 border-primary bg-popover" aria-hidden />
                Fotos
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={verLimites} onCheckedChange={(valor) => setVerLimites(valor === true)} />
              <span className="flex items-center gap-1.5">
                <span className="h-px w-4 bg-muted-foreground" aria-hidden />
                Limites municipais
              </span>
            </label>
          </div>
        }
      >
        {() => (
          <div className="flex h-full min-h-0 flex-col gap-2">
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border">
              <MapaMalha
                className="h-full w-full"
                segmentos={segmentos}
                obras={obras}
                fotos={fotosNoMapa}
                selecionado={selecionado}
                verLimites={verLimites}
                aoFalharLimites={() => setVerLimites(false)}
                aoClicarSegmento={(id) => void selecionar("cdSegmentoRodovia", id)}
                aoClicarFoto={setFotoAberta}
                aoFiltrarArea={(ids) => void selecionar("cdSegmentoRodovia", ids)}
              />
              {segmentosCubo.carregando && (
                <div role="status" aria-label="Carregando o mapa" className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted">
                  <div className="h-full w-1/3 animate-barra-carregando bg-primary" />
                </div>
              )}
              {!segmentosCubo.carregando && segmentos.length === 0 && (
                <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-md border border-border bg-sidebar px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-custom">Nenhum segmento avaliado para os filtros atuais.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
              <LegendaCondicao
                aoClicar={(condicao) => void selecionar("Avaliação condição do segmento", condicao)}
                // Sem os km ainda, a legenda fica só com as cores: "0 km · 0%" pareceria um resultado
                valores={kmsLegenda ? Object.fromEntries(condicoes.map((condicao, i) => [condicao, `${formatarKm(kms[i])} · ${totalKm ? Math.round((kms[i] / totalKm) * 100) : 0}%`])) : undefined}
              />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {segmentosCubo.carregando && !segmentosCubo.linhas
                  ? "Carregando segmentos…"
                  : segmentosCubo.truncado
                    ? `Mostrando ${LIMITE_SEGMENTOS.toLocaleString("pt-BR")} de ${segmentosCubo.total.toLocaleString("pt-BR")} segmentos: refine os filtros para ver todos.`
                    : `${segmentosCubo.total.toLocaleString("pt-BR")} segmentos · clique num segmento para ver a avaliação e as fotos.`}
              </span>
            </div>
          </div>
        )}
      </Cartao>

      <Cartao
        titulo={selecionado ? "Segmento selecionado" : "Fotos das vistorias"}
        className="h-auto min-h-[420px] shrink-0 lg:h-auto lg:min-h-0 lg:w-[400px] xl:w-[460px]"
        acoes={
          selecionado ? (
            <Button variant="outline" size="sm" onClick={limpar} className="border-input bg-sidebar text-foreground">
              <ArrowLeft aria-hidden />
              Ver todos os segmentos
            </Button>
          ) : undefined
        }
      >
        {() => (
          <div className="h-full min-h-0 px-1">
            <Galeria fotos={fotos} carregando={fotosCubo.carregando} total={fotosCubo.total} aberta={aberta} abrir={setFotoAberta}>
              {selecionado ? (
                <>
                  <DetalheSegmento key={selecionado} id={selecionado} />
                  <h3 className="text-xs font-medium text-muted-foreground">Fotos deste segmento</h3>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Fotos mais recentes dos segmentos nos filtros atuais. Clique num segmento do mapa para ver a avaliação dele.</p>
              )}
            </Galeria>
          </div>
        )}
      </Cartao>
    </div>
  );
};
