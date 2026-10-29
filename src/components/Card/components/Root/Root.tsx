import { HtmlHTMLAttributes } from "react";

import { cn } from "@/shared/utils/tailwind/cn";

type CardProps = HtmlHTMLAttributes<HTMLDivElement>;

const Card = ({ className, children, ...props }: CardProps) => (
  <div
    className={cn(
      "relative flex flex-col bg-sidebar borda-vidro backdrop-blur-custom rounded-lg overflow-hidden p-3 gap-4",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export default Card;
