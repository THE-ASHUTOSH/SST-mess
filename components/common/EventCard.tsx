"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
  redirectUrl?: string;
  enabled?: boolean;
  icon?: LucideIcon;
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  description,
  children,
  redirectUrl,
  enabled = true,
  icon: Icon,
}) => {
  const cardContent = (
    <div
      className={cn(
        "app-shell-kpi h-full w-full rounded-2xl px-4 py-4 flex flex-col gap-3 overflow-hidden transition-all duration-300 ease-out",
        enabled
          ? "hover:bg-card-hover hover:-translate-y-0.5 cursor-pointer group"
          : "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {Icon ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--surface-active)] text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate"
              title={title}
            >
              {title}
            </h3>
            {description ? (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {enabled ? (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        ) : null}
      </div>
      {children ? (
        <div className="text-sm text-muted-foreground min-w-0">{children}</div>
      ) : null}
    </div>
  );

  if (redirectUrl && enabled) {
    return (
      <Link href={redirectUrl} className="block h-full min-w-0">
        {cardContent}
      </Link>
    );
  }

  return <div className="h-full min-w-0">{cardContent}</div>;
};

export default EventCard;
