"use client";

import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { RoleNavConfig } from "@/lib/dashboard/navigation";

interface AppLayoutShellProps {
  navConfig: RoleNavConfig;
  children: ReactNode;
  contentTopPaddingClass?: string;
}

export default function AppLayoutShell({
  navConfig,
  children,
  contentTopPaddingClass = "pt-16",
}: AppLayoutShellProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setIsSidebarExpanded((prev) => !prev);
    } else {
      setIsMobileSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="app-shell-canvas flex h-screen w-full overflow-hidden">
      <Sidebar
        config={navConfig}
        isExpanded={isSidebarExpanded}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div
        className={`flex h-screen min-h-0 min-w-0 flex-1 flex-col ml-0 overflow-hidden transition-[margin-left] duration-300 ease-in-out ${
          isSidebarExpanded ? "md:ml-64" : "md:ml-[5.5rem]"
        }`}
      >
        <Topbar
          homeHref={navConfig.homeHref}
          roleLabel={navConfig.label}
          onToggleSidebar={toggleSidebar}
        />
        <main className={`min-h-0 flex-1 overflow-auto ${contentTopPaddingClass}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
