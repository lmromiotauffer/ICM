import { HTMLAttributes, createElement } from "react";
import { tv, VariantProps } from "tailwind-variants";

import { cn } from "@/shared/utils/tailwind/cn";

const typographyVariants = tv({
  base: "text-foreground",
  variants: {
    variant: {
      "text-2xs": `
          font-normal
          text-[11px]
          leading-[16px]
          tracking-[0.11px]
        `,

      "text-xs": `
          font-normal
          text-xs
          leading-[16px]
          tracking-[0.12px]
          overflow-hidden text-ellipsis
        `,

      "text-sm": `
          font-medium
          text-sm
          leading-5
          overflow-hidden text-ellipsis
        `,
      "text-base": `
          font-semibold
          text-base
          leading-none
        `,
      "text-lg": `
          font-normal
          text-lg
        `,
      "text-2xl": `
          font-semibold
          text-2xl
          leading-none
          tracking-[-0.6px]
        `,
    },
  },
  defaultVariants: {
    variant: "text-base",
  },
});

type TypographyProps = VariantProps<typeof typographyVariants> & HTMLAttributes<HTMLElement>;

const Typography = ({
  className,
  children,
  variant = "text-base",
  ...props
}: TypographyProps) => {
  const text = typographyVariants({ variant });

  // Só ausência vira travessão: o número 0 é um valor
  if (children == null || children === "" || children === false)
    return (
      <span className={cn(text, className)} {...props}>
        –
      </span>
    );

  const tag =
    // text-2xl/text-lg: título da página (wrapper.tsx), o único h1 do documento
    ({ "text-2xl": "h1", "text-lg": "h1", "text-2xs": "p" } as Record<string, string>)[
      variant
    ] ?? "span";
  return createElement(
    tag,
    { className: cn(text, className), ...props },
    children,
  );
};

export default Typography;
