"use client"
import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'
import { SignOutButton } from "@clerk/nextjs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const Header = () => {
  const { user, setUser } = useUser();
  const router = useRouter();

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'vendor') return '/vendorUser/dashboard';
    return '/student/dashboard';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex flex-col">
            <Link href="/" className="flex items-center">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
                SST Mess
              </span>
            </Link>
            {user && (
              <span className="text-sm text-muted-foreground">
                Welcome back, <span className="text-foreground font-medium">{user.name?.split(' ')[0]}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <Button asChild variant="default" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20">
                <Link href="/login">Login</Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.picture || '/avatar_placeholder.png'} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">{user.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(getDashboardLink())}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <SignOutButton redirectUrl='/login'>
                    <DropdownMenuItem onClick={() => setUser(null)} className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer">
                      Logout
                    </DropdownMenuItem>
                  </SignOutButton>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header