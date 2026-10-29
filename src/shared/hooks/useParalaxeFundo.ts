import { useEffect } from "react";
import { movimentoReduzido } from "./useMovimentoReduzido";

const AMPLITUDE = 12; // px de deslocamento máximo em cada eixo

/** Desloca as camadas do fundo (body::before, #root::before) no sentido contrário ao ponteiro.
 *  Escreve --paralaxe-x/y no body; o CSS faz o resto. Só com mouse e sem movimento reduzido. */
export const useParalaxeFundo = (): void => {
  useEffect(() => {
    if (movimentoReduzido() || !window.matchMedia("(pointer: fine)").matches) return;
    const estilo = document.body.style;
    let quadro = 0;
    const aoMover = (e: PointerEvent) => {
      if (quadro) return;
      quadro = requestAnimationFrame(() => {
        quadro = 0;
        estilo.setProperty("--paralaxe-x", `${(0.5 - e.clientX / window.innerWidth) * 2 * AMPLITUDE}px`);
        estilo.setProperty("--paralaxe-y", `${(0.5 - e.clientY / window.innerHeight) * 2 * AMPLITUDE}px`);
      });
    };
    window.addEventListener("pointermove", aoMover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", aoMover);
      cancelAnimationFrame(quadro);
      estilo.removeProperty("--paralaxe-x");
      estilo.removeProperty("--paralaxe-y");
    };
  }, []);
};
