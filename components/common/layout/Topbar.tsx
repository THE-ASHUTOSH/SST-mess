"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SignOutButton, useAuth, useUser as useClerkUser } from "@clerk/nextjs";
import { useUser } from "@/context/UserContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TopbarProps {
  homeHref: string;
  roleLabel?: string;
  /** Omit on shells with no sidebar (e.g. the no-access screen) — the menu button is hidden. */
  onToggleSidebar?: () => void;
}

export default function Topbar({
  homeHref,
  roleLabel,
  onToggleSidebar,
}: TopbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useClerkUser();
  const router = useRouter();

  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  // An unregistered user has a Clerk session but no app account, and still needs a way out —
  // so the account menu keys off the session, falling back to Clerk's profile for display.
  const showAccountMenu = !!user || !!isSignedIn;
  const displayName = user?.name || clerkUser?.fullName || "Account";
  const displayEmail = user?.email || clerkUser?.primaryEmailAddress?.emailAddress || "";
  const displayPicture = user?.picture || clerkUser?.imageUrl || "/avatar_placeholder.png";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 border-b border-border/80 app-shell-topbar",
      )}
    >
      <div className="h-16 pl-0 pr-3 md:pr-4 flex items-center gap-2 md:gap-3">
        {onToggleSidebar ? (
          <button
            className="w-[5.5rem] h-full flex items-center justify-center hover:bg-[color:var(--surface-hover)] transition-colors"
            onClick={onToggleSidebar}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6 text-muted-foreground" />
          </button>
        ) : (
          <div className="w-4 md:w-6" />
        )}

        <Link href={homeHref} className="shrink-0 cursor-pointer">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            SST Mess
          </span>
        </Link>

        {roleLabel ? (
          <span className="hidden sm:inline-flex text-xs font-medium text-muted-foreground app-shell-pill px-2.5 py-1">
            {roleLabel}
          </span>
        ) : null}

        <div className="flex-1" />

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-full hover:bg-[color:var(--surface-hover)] transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-foreground" />
            )}
          </button>

          {!showAccountMenu ? (
            <Button asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={displayPicture} alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {displayEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* No app account means no dashboard to go to — logout is the only action. */}
                {user && (
                  <>
                    <DropdownMenuItem onClick={() => router.push(homeHref)}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {/* `?signedOut=1` tells middleware not to bounce this arrival back to a dashboard
                    while the session cookie is still settling. No onClick clearing of the user
                    here: UserContext already nulls it when Clerk's user goes away, and mutating
                    this menu's children mid-click tore items out from under Radix. */}
                <SignOutButton redirectUrl="/login?signedOut=1">
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </SignOutButton>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
