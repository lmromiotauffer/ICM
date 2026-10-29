import { useCallback, useSyncExternalStore } from "react";

export const useConsultaMidia = (consulta: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(consulta);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [consulta],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(consulta).matches);
};
