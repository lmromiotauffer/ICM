import { cn } from "@/shared/utils/tailwind/cn";
import Typography from "@/components/Typography/Typography";

export type HeaderProps = {
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

const Header = ({ title, children, className }: HeaderProps) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:flex-row flex-1 flex-wrap lg:items-center justify-between gap-5 px-4 py-2 border-b border-border min-h-10",
        className,
      )}
    >
      {/* Título do cartão entra na navegação por títulos do leitor de tela (o h1 é o da página) */}
      <Typography variant="text-xs" role="heading" aria-level={2} className="flex-1 text-inherit font-medium">
        {title}
      </Typography>
      {children}
    </div>
  );
};

export default Header;
