import { createContext, useContext, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useConsultaMidia } from "@/shared/hooks/useConsultaMidia";

type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

type ThemeProviderState = {
  theme: Theme;
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "light",
  preference: "system",
  isDark: false,
  setPreference: () => null,
});

// try: com armazenamento bloqueado (política de cookies, iframe de terceiros) o acesso lança durante o render
// e a página inteira ficava em branco
const readPreference = (): ThemePreference => {
  try {
    const stored = localStorage.getItem("theme");
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    return "system";
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const systemIsDark = useConsultaMidia("(prefers-color-scheme: dark)");

  const theme: Theme =
    preference === "system" ? (systemIsDark ? "dark" : "light") : preference;

  // Layout effect: a classe precisa estar no <html> ao fim do flushSync, antes da captura da View Transition
  useLayoutEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const value: ThemeProviderState = {
    theme,
    preference,
    isDark: theme === "dark",
    setPreference: (newPreference) => {
      try {
        if (newPreference === "system") localStorage.removeItem("theme");
        else localStorage.setItem("theme", newPreference);
      } catch {
        // Sem armazenamento, a escolha vale só nesta sessão
      }
      // Crossfade da página inteira; sem suporte, ou quando o tema resultante é o mesmo (Sistema ↔ Claro com
      // o sistema claro), a troca é instantânea: 250 ms de página travada para um fade igual a ele mesmo
      const novoTema: Theme = newPreference === "system" ? (systemIsDark ? "dark" : "light") : newPreference;
      if (!document.startViewTransition || novoTema === theme) return setPreferenceState(newPreference);
      document.startViewTransition(() => flushSync(() => setPreferenceState(newPreference)));
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeProviderContext);
