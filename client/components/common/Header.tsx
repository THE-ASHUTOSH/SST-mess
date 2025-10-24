"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();


  return (
    <header className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800/50 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-400 hover:from-indigo-400 hover:via-purple-500 hover:to-blue-400 transition-all duration-500">
              SST Mess
            </Link>
          </div>


          {/* Auth Buttons - Desktop */}
          <div className="hidden md:block">
            <div className="space-x-2">
              <Link href="/login" 
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-0.5">
                Login
              </Link>
              
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden animate-fade-in-down">
          <div className="px-2 pt-2 pb-3 space-y-2 sm:px-3">
            
            <div className="mt-6 pt-4 border-t border-gray-700/50 space-y-2">
              <Link href="/login" 
                className="block w-full text-center px-4 py-2 rounded-lg text-base font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-purple-500 hover:to-blue-500 transition-all duration-300 hover:shadow-md hover:shadow-purple-500/20" 
                onClick={() => setIsMenuOpen(false)}>
                Login
              </Link>
              
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header