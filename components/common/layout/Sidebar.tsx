"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  AppNavItem,
  RoleNavConfig,
  isNavItemActive,
} from "@/lib/dashboard/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  config: RoleNavConfig;
  isExpanded: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  config,
  isExpanded,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const renderDesktopItem = (item: AppNavItem) => {
    const active = isNavItemActive(pathname, item.href);
    const Icon = item.icon;

    const itemClass = cn(
      "group flex w-full shrink-0 items-center justify-start h-11 rounded-xl pl-[22px] pr-3 text-left transition-colors duration-200",
      active
        ? "bg-[color:var(--surface-active)] text-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-[color:var(--surface-hover)]",
    );

    const labelClass = cn(
      "min-w-0 overflow-hidden whitespace-nowrap text-sm font-medium leading-none transition-[max-width,opacity,margin] duration-200",
      isExpanded
        ? "ml-3 max-w-[10.5rem] flex-1 opacity-100"
        : "ml-0 max-w-0 opacity-0 pointer-events-none",
    );

    return (
      <Link key={item.id} href={item.href} className={itemClass}>
        <Icon className="h-5 w-5 shrink-0" />
        <span className={labelClass}>{item.label}</span>
      </Link>
    );
  };

  const renderMobileItem = (item: AppNavItem) => {
    const active = isNavItemActive(pathname, item.href);
    const Icon = item.icon;
    const itemClass = cn(
      "flex shrink-0 items-center gap-3 px-3 py-3 rounded-xl transition-colors",
      active
        ? "bg-[color:var(--surface-active)] text-primary"
        : "text-foreground hover:bg-[color:var(--surface-hover)]",
    );

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={onCloseMobile}
        className={itemClass}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "sidebar-scroll-area hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] app-shell-sidebar border-r border-border/70 flex-col z-20 transition-[width] duration-300 ease-in-out overflow-y-scroll overscroll-contain",
          isExpanded ? "w-64" : "w-[5.5rem]",
        )}
      >
        <div className="flex min-h-full flex-col px-2 pb-5 pt-2">
          <nav className="flex flex-col items-stretch gap-2">
            {config.items.map(renderDesktopItem)}
          </nav>
          {config.footerItems?.length ? (
            <div className="mt-auto pt-2">
              {config.footerItems.map(renderDesktopItem)}
            </div>
          ) : null}
        </div>
      </aside>

      {isMobileOpen ? (
        <div
          className="md:hidden fixed inset-0 bg-black/45 z-40"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 h-screen w-72 app-shell-sidebar border-r border-border/70 shadow-lg z-50 transform transition-transform duration-300 flex flex-col overflow-hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-border/70">
          <span className="text-base font-semibold text-foreground tracking-tight">
            SST Mess
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg hover:bg-[color:var(--surface-hover)] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <nav className="sidebar-scroll-area flex min-h-0 flex-1 flex-col gap-1 overflow-y-scroll overscroll-contain p-3">
          {config.items.map(renderMobileItem)}
          {config.footerItems?.map(renderMobileItem)}
        </nav>
      </aside>
    </>
  );
}
