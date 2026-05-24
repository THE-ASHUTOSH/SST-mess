"use client";

import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  description?: string;
  backPath?: string;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  backPath,
  action,
  className = "",
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className={`app-page-header ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {backPath ? (
              <button
                onClick={() => router.push(backPath)}
                className="p-1 rounded-lg hover:bg-[color:var(--surface-hover)] transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
            ) : null}
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
          </div>
          {description ? (
            <p
              className={`text-sm text-muted-foreground ${backPath ? "ml-8" : ""}`}
            >
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
