import { useEffect, useRef, useState } from "react";
import { useQlik } from "@cluster-data-experience/qlik-modules";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/shared/utils/tailwind/cn";
import logoMt from "@/shared/assets/logo-mt.png";
import fotoObra from "@/shared/assets/obra-loading.jpg";
import { movimentoReduzido } from "@/shared/hooks/useMovimentoReduzido";

const DISTANCIA_CONEXAO = 140;
// Sem resposta do Qlik depois disso, oferece tentar de novo
const LIMITE_CONEXAO_MS = 20000;

// Rede de pontos que se conectam por linhas quando ficam próximos
function FundoConexoes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduzido = movimentoReduzido();
    let largura = 0;
    let altura = 0;
    let pontos: { x: number; y: number; vx: number; vy: number }[] = [];
    let quadro = 0;

    const redimensionar = () => {
      const escala = window.devicePixelRatio || 1;
      largura = canvas.clientWidth;
      altura = canvas.clientHeight;
      canvas.width = largura * escala;
      canvas.height = altura * escala;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      const quantidade = Math.min(90, Math.round((largura * altura) / 16000));
      pontos = Array.from({ length: quantidade }, () => ({
        x: Math.random() * largura,
        y: Math.random() * altura,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      }));
    };

    const desenhar = () => {
      ctx.clearRect(0, 0, largura, altura);
      for (const p of pontos) {
        if (!reduzido) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > largura) p.vx *= -1;
          if (p.y < 0 || p.y > altura) p.vy *= -1;
        }
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // ponytail: O(n²) com até 90 pontos, usar grade espacial se aumentar muito
      for (let i = 0; i < pontos.length; i++) {
        for (let j = i + 1; j < pontos.length; j++) {
          const distancia = Math.hypot(pontos[i].x - pontos[j].x, pontos[i].y - pontos[j].y);
          if (distancia > DISTANCIA_CONEXAO) continue;
          ctx.strokeStyle = `rgba(255,255,255,${0.25 * (1 - distancia / DISTANCIA_CONEXAO)})`;
          ctx.beginPath();
          ctx.moveTo(pontos[i].x, pontos[i].y);
          ctx.lineTo(pontos[j].x, pontos[j].y);
          ctx.stroke();
        }
      }
      if (!reduzido) quadro = requestAnimationFrame(desenhar);
    };

    const aoRedimensionar = () => {
      redimensionar();
      if (reduzido) desenhar();
    };

    redimensionar();
    desenhar();
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

// Progresso indeterminado; herda a cor do texto para servir em qualquer fundo
export function BarraCarregando({ className }: { className?: string }) {
  return (
    <div className={cn("h-0.5 w-40 overflow-hidden rounded-full bg-current/15", className)}>
      <div className="h-full w-1/3 rounded-full bg-current/80 animate-barra-carregando" />
    </div>
  );
}

type PageLoaderProps = {
  saindo?: boolean;
  aoSair?: () => void;
};

export function PageLoader({ saindo = false, aoSair }: PageLoaderProps) {
  const { error, sessionState } = useQlik();
  const [demorou, setDemorou] = useState(false);
  const [fotoCarregada, setFotoCarregada] = useState(false);
  const [recarregando, setRecarregando] = useState(false);

  useEffect(() => {
    const limite = setTimeout(() => setDemorou(true), LIMITE_CONEXAO_MS);
    return () => clearTimeout(limite);
  }, []);

  const falhou = !saindo && (Boolean(error) || sessionState === "error");
  const mostrarErro = falhou || (demorou && !saindo);

  return (
    <div
      className={cn(
        "carregador-pagina fixed inset-0 z-50 overflow-hidden bg-[#11161f] transition-opacity duration-(--duracao-media) ease-(--ease-saida)",
        saindo && "pointer-events-none opacity-0",
      )}
      onTransitionEnd={(e) => {
        if (saindo && e.target === e.currentTarget) aoSair?.();
      }}
    >
      {/* Foto de obra do estado, escurecida para o logo continuar em destaque */}
      <img
        src={fotoObra}
        alt=""
        aria-hidden="true"
        // Já em cache, o load pode ter disparado antes do React escutar
        ref={(img) => {
          if (img?.complete) setFotoCarregada(true);
        }}
        onLoad={() => setFotoCarregada(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duracao-longa) ease-(--ease-suave)",
          !fotoCarregada && "opacity-0",
        )}
      />
      <div className="absolute inset-0 bg-[#11161fE0] opacity-85" />
      {/* Centro mais escuro para destacar logo e progresso sobre a foto */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(17,22,31,0.9)_0,rgba(17,22,31,0.5)_200px,transparent_450px)]" />
      <FundoConexoes />
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 text-white text-center px-4">
        <img src={logoMt} alt="Governo de Mato Grosso" className="size-[72px] object-contain" />

        <div className="flex flex-col items-center gap-1">
          <p className="text-2xl font-medium max-w-[278px] text-white">
            Painel do ICM
          </p>
          <p className="text-sm text-white/70">Condição da malha rodoviária · SINFRA-MT</p>
        </div>

        {/* Brasão fica parado; o progresso fica separado, abaixo do nome */}
        <div role="status" className="flex flex-col items-center gap-3">
          {mostrarErro ? (
            <>
              <span className="animate-esmaecer text-sm text-white/90">
                {falhou
                  ? "Não foi possível conectar aos dados."
                  : "A conexão está demorando mais que o esperado."}
              </span>
              {/* Fundo escuro fixo: o anel padrão (azul a 70%) some; branco a 70% dá ≥ 4,8:1 */}
              <Button
                onClick={() => {
                  setRecarregando(true);
                  window.location.reload();
                }}
                className="animate-esmaecer focus-visible:ring-white/70 active:scale-[0.97] active:duration-[80ms] motion-reduce:active:scale-100"
              >
                <RotateCw className="icone-recarregar" data-girando={recarregando} />
                Tentar novamente
              </Button>
            </>
          ) : (
            <>
              <BarraCarregando />
              <span className="text-sm text-white/70">Conectando aos dados…</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
