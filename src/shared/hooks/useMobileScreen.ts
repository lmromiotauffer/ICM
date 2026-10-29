import { useConsultaMidia } from './useConsultaMidia';

// Exclusivo, como o min-width das classes md:/lg:: na largura exata do breakpoint já é desktop
export const useMobileScreen = (breakpoint: number): boolean =>
  useConsultaMidia(`(width < ${breakpoint}px)`);
