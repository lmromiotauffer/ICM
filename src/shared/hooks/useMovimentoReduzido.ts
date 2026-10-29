const CONSULTA = "(prefers-reduced-motion: reduce)";

/** Preferência do sistema por menos movimento; o CSS já a respeita, isto é para animações em JS (ECharts, FLIP, canvas). */
export const movimentoReduzido = (): boolean => window.matchMedia(CONSULTA).matches;
