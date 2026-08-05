import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }) {
  return (
    <nav
      role="navigation"
      aria-label="Paginacion"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ className, ...props }) {
  return <li className={cn("", className)} {...props} />;
}

function PaginationButton({
  className,
  isActive,
  size = "icon-sm",
  "aria-label": ariaLabel,
  ...props
}) {
  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      aria-label={ariaLabel}
      className={cn("min-w-7", className)}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }) {
  return (
    <PaginationButton
      aria-label="Pagina anterior"
      title="Pagina anterior"
      className={cn("gap-1 px-2", className)}
      size="sm"
      {...props}
    >
      <ChevronLeft className="size-4" />
      <span className="hidden sm:inline">Anterior</span>
    </PaginationButton>
  );
}

function PaginationNext({ className, ...props }) {
  return (
    <PaginationButton
      aria-label="Pagina siguiente"
      title="Pagina siguiente"
      className={cn("gap-1 px-2", className)}
      size="sm"
      {...props}
    >
      <span className="hidden sm:inline">Siguiente</span>
      <ChevronRight className="size-4" />
    </PaginationButton>
  );
}

function PaginationEllipsis({ className, ...props }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-7 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationButton,
  PaginationNext,
  PaginationPrevious,
};
