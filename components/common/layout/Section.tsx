import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceVariant = "default" | "muted" | "glass";
type DensityVariant = "comfortable" | "compact";

interface SectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  surface?: SurfaceVariant;
  density?: DensityVariant;
  className?: string;
}

export default function Section({
  title,
  description,
  action,
  children,
  surface = "default",
  density = "comfortable",
  className,
}: SectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border",
        surface === "glass" ? "app-shell-panel" : "theme-section",
        surface === "muted" ? "bg-muted/60" : "",
        density === "compact" ? "p-3" : "p-4",
        className,
      )}
    >
      {title || action ? (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title ? (
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div>{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
