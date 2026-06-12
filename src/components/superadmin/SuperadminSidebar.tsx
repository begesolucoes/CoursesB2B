'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, Building2, LogOut, Menu, X, Globe, User } from 'lucide-react'

interface SuperadminSidebarProps {
  userName: string
  userEmail: string
  children: React.ReactNode
}

export default function SuperadminSidebar({ userName, userEmail, children }: SuperadminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    {
      name: 'Painel Geral',
      href: '/superadmin',
      icon: LayoutDashboard,
    },
    {
      name: 'Empresas (Tenants)',
      href: '/superadmin/tenants',
      icon: Building2,
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white flex items-center justify-between p-4 shadow-md z-30">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-indigo-400 animate-pulse" />
          <span className="font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
            LMS Superadmin
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-slate-300 hover:text-white focus:outline-none"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Drawer */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col justify-between z-20 transition-transform duration-300 transform md:transform-none shadow-xl border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-800">
            <Globe className="h-8 w-8 text-indigo-400 animate-pulse" />
            <div>
              <h1 className="font-extrabold text-white text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-indigo-300">
                SCORM LMS
              </h1>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Superadmin
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-8 px-4 flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-950/30 font-semibold'
                      : 'hover:bg-slate-800/60 hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 px-2 py-1 mb-4">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow">
              <User className="h-5 w-5 text-slate-100" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-200 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors duration-150"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen flex flex-col overflow-y-auto">
        <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-10 md:hidden transition-opacity duration-300"
        />
      )}
    </div>
  )
}
