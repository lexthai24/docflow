import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3.5" />}
              {c.href ? (
                <Link href={c.href} className="hover:text-foreground transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
