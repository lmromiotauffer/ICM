import { useTheme, type ThemePreference } from "@/shared/contexts/ThemeContext";
import { cn } from "@/shared/utils/tailwind/cn";
import { Monitor } from "lucide-react";
import { useId, useState } from "react";

const anelFoco = "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/70";

type Animacao = "virar" | "encenar";
type PropsIcone = { size?: number; className?: string; "data-animar"?: Animacao };

const raiosSol = [
  "M12 2v2",
  "M12 20v2",
  "m4.93 4.93 1.41 1.41",
  "m17.66 17.66 1.41 1.41",
  "M2 12h2",
  "M20 12h2",
  "m6.34 17.66-1.41 1.41",
  "m19.07 4.93-1.41 1.41",
];

/** Sol e lua num só desenho, para um virar o outro: o núcleo cresce, a "mordida" entra pelo canto
 * superior direito recortando o crescente e os raios recolhem. Traço igual ao do Lucide (viewBox 24, 2px).
 * Contorno interno da lua = círculo da mordida recortado pelo disco do núcleo (raio + meia espessura).
 * Estrela do Lucide MoonStar no canto da mordida: só aparece na lua */
const IconeSolLua = ({ lua, size = 24, className, ...props }: PropsIcone & { lua: boolean }) => {
  const id = useId();
  const nucleo = lua ? 9 : 4;
  // No sol, a mordida fica fora do desenho, 8 unidades acima e à direita
  const mordida = lua ? { cx: 17, cy: 7 } : { cx: 25, cy: -1 };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("icone-sol-lua", className)}
      data-lua={lua}
      {...props}
    >
      <mask id={`${id}mordida`} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="white" stroke="none" />
        <circle className="sol-lua-mordida" {...mordida} r="7.5" fill="black" stroke="none" />
      </mask>
      <clipPath id={`${id}disco`}>
        <circle className="sol-lua-disco" cx="12" cy="12" r={nucleo + 1} />
      </clipPath>
      <circle className="sol-lua-nucleo" cx="12" cy="12" r={nucleo} mask={`url(#${id}mordida)`} />
      <g clipPath={`url(#${id}disco)`}>
        <circle className="sol-lua-mordida" {...mordida} r="6.5" />
      </g>
      <g className="sol-lua-estrela">
        <path d="M18 5h4" />
        <path d="M20 3v4" />
      </g>
      <g className="sol-lua-raios">
        {raiosSol.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
};

const IconeSol = (props: PropsIcone) => <IconeSolLua lua={false} {...props} />;
const IconeLua = (props: PropsIcone) => <IconeSolLua lua {...props} />;

const opcoes: {
  valor: ThemePreference;
  rotulo: string;
  curto: string;
  Icone: (props: PropsIcone) => React.ReactNode;
}[] = [
  { valor: "system", rotulo: "Tema do sistema", curto: "Sistema", Icone: Monitor },
  { valor: "light", rotulo: "Tema claro", curto: "Claro", Icone: IconeSol },
  { valor: "dark", rotulo: "Tema escuro", curto: "Escuro", Icone: IconeLua },
];

/** Alternador de tema; `compacto` é um único botão que percorre as opções no menu lateral recolhido */
export const ThemeToggle = ({ compacto = false }: { compacto?: boolean }) => {
  const { preference, theme, setPreference } = useTheme();
  // Opção clicada: o ícone só se anima quando ela também é a preferência. Assim não anima ao montar
  // e o ícone antigo não muda antes da captura da View Transition (a preferência só troca no flushSync)
  const [clique, setClique] = useState<{ valor: ThemePreference; temaAntes: typeof theme } | null>(null);
  const escolher = (valor: ThemePreference) => {
    setClique({ valor, temaAntes: theme });
    setPreference(valor);
  };
  // Sol e lua só viram um no outro quando o tema da tela inverte de fato; senão, cada ícone encena o seu
  const animacao = (valor: ThemePreference): Animacao | undefined => {
    if (clique?.valor !== valor || preference !== valor) return undefined;
    return valor !== "system" && clique.temaAntes !== theme ? "virar" : "encenar";
  };

  if (compacto) {
    const indiceAtual = opcoes.findIndex((opcao) => opcao.valor === preference);
    const atual = opcoes[indiceAtual];
    const proxima = opcoes[(indiceAtual + 1) % opcoes.length];

    return (
      <button
        type="button"
        onClick={() => escolher(proxima.valor)}
        aria-label={`${atual.rotulo}. Mudar para ${proxima.rotulo.toLowerCase()}`}
        title={atual.rotulo}
        className={cn(
          "text-secondary-foreground hover:bg-sidebar-border/30 flex size-9 cursor-pointer items-center justify-center rounded-md transicao-feedback",
          anelFoco,
        )}
      >
        <atual.Icone key={atual.valor} size={16} className="icone-tema" data-animar={animacao(atual.valor)} />
      </button>
    );
  }

  const classe = (ativo: boolean) =>
    cn(
      // pointer-coarse: no toque as opções crescem para 36px
      "flex flex-1 h-7 pointer-coarse:h-9 items-center justify-center gap-1.5 rounded-sm text-xs font-medium cursor-pointer",
      anelFoco,
      "relative transicao-feedback",
      ativo ? "text-n-active-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div
      role="group"
      aria-label="Tema"
      className="bg-sidebar-border/25 relative flex h-8 pointer-coarse:h-10 w-full items-center gap-0.5 rounded-md p-0.5"
    >
      {/* Marcador único que desliza até a opção: 3 colunas iguais, gap de 2px */}
      <span
        aria-hidden="true"
        className="seletor-tema-marcador bg-n-active absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-8px)/3)] rounded-sm shadow-xs"
        style={{ "--indice": opcoes.findIndex((opcao) => opcao.valor === preference) } as React.CSSProperties}
      />
      {opcoes.map(({ valor, rotulo, curto, Icone }) => (
        <button
          key={valor}
          type="button"
          onClick={() => escolher(valor)}
          className={classe(preference === valor)}
          aria-label={rotulo}
          aria-pressed={preference === valor}
        >
          <Icone size={14} className="icone-tema" data-animar={animacao(valor)} />
          {curto}
        </button>
      ))}
    </div>
  );
};
