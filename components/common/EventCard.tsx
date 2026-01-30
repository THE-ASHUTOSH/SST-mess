"use client";

import React, { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EventCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
  redirectUrl?: string;
  enabled?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  title,
  description,
  children,
  redirectUrl,
  enabled = true,
}: EventCardProps) => {
  const cardContent = (
    <Card
      className={cn(
        "h-full transition-all duration-300 ease-out",
        "bg-card border border-border/60 rounded-xl",
        "shadow-sm",
        enabled
          ? "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
          : "opacity-50 cursor-not-allowed",
        "flex flex-col overflow-hidden group"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="flex-1 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );

  if (redirectUrl && enabled) {
    return <Link href={redirectUrl} className="block h-full">{cardContent}</Link>;
  }

  return <div className="h-full">{cardContent}</div>;
};

export default EventCard;