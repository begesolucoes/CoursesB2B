'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  BarChart3, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  UserCheck
} from 'lucide-react'

interface TenantAdminSidebarProps {
  tenantName: string
  tenantSlug: string
  logoUrl?: string | null
  primaryColor?: string
  userName: string
  userEmail: string
  children: React.ReactNode
}

export default function TenantAdminSidebar({
  tenantName,
  tenantSlug,
  logoUrl,
  primaryColor = '#3b82f6', // default blue
  userName,
  userEmail,
  children
}: TenantAdminSidebarProps) {
  // Estado para colapsar/expandir a sidebar (por padrão, inicia aberta no desktop)
  const [isCollapsed, setIsCollapsed] = useState(false)
  // Estado para menu mobile
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const pathname = usePathname()

  // Salva a preferência de colapso no localStorage localmente
  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  const toggleCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('admin_sidebar_collapsed', String(nextState))
  }

  // Definição das rotas limpas (o middleware reescreve internamente)
  const navItems = [
    {
      name: 'Painel Geral',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Colaboradores',
      href: '/admin/users',
      icon: Users,
    },
    {
      name: 'Cursos SCORM',
      href: '/admin/courses',
      icon: BookOpen,
    },
    {
      name: 'Relatórios',
      href: '/admin/reports',
      icon: BarChart3,
    },
  ]

  // Função para pegar as iniciais do nome da empresa ou usuário
  const getInitials = (str: string) => {
    return str
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* 📱 HEADER MOBILE (Sempre no topo em telas pequenas) */}
      <header className="md:hidden bg-white text-slate-800 flex items-center justify-between p-4 shadow-sm border-b border-slate-100 z-30">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} className="h-8 max-w-[120px] object-contain" />
          ) : (
            <div 
              style={{ backgroundColor: primaryColor }}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
            >
              {getInitials(tenantName)}
            </div>
          )}
          <span className="font-bold text-slate-800 tracking-tight text-sm truncate max-w-[150px]">
            {tenantName}
          </span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg focus:outline-none transition"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* 🖥️ SIDEBAR PRINCIPAL (Para desktop e menu mobile deslizante) */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-white text-slate-500 flex flex-col justify-between z-20 border-r border-slate-150 transition-all duration-300 ease-in-out shadow-sm ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo e cabeçalho do Tenant */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 h-[73px]">
            <div className="flex items-center gap-3 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={tenantName} className="h-8 max-w-[120px] object-contain shrink-0" />
              ) : (
                <div 
                  style={{ backgroundColor: primaryColor }}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0"
                >
                  {getInitials(tenantName)}
                </div>
              )}
              
              {!isCollapsed && (
                <div className="truncate animate-fade-in">
                  <h1 className="font-extrabold text-slate-800 text-sm tracking-tight truncate w-36">
                    {tenantName}
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Portal RH
                  </span>
                </div>
              )}
            </div>

            {/* Botão de recolher (Oculto no Mobile) */}
            <button
              onClick={toggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Links de Navegação */}
          <nav className="mt-6 px-3.5 flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-200 group relative ${
                    isCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'hover:bg-slate-100/70 hover:text-slate-800 text-slate-500'
                  }`}
                  style={isActive && !isCollapsed ? { backgroundColor: '#0f172a' } : undefined}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  
                  {!isCollapsed && (
                    <span className="text-sm font-bold tracking-tight truncate">{item.name}</span>
                  )}

                  {/* Tooltip quando colapsado */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Perfil e Botão Sair */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40">
          <div className={`flex items-center gap-3 px-1 mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shadow-sm border border-slate-300 shrink-0">
              {getInitials(userName)}
            </div>
            
            {!isCollapsed && (
              <div className="overflow-hidden animate-fade-in">
                <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{userEmail}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 ${
              isCollapsed ? 'justify-center px-0' : 'px-4'
            }`}
            title="Sair da plataforma"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            {!isCollapsed && <span>Sair</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50 whitespace-nowrap">
                Sair
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Area de Conteúdo Principal */}
      <main className="flex-1 min-h-screen flex flex-col overflow-y-auto">
        <div className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </div>
      </main>

      {/* Overlay para Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-10 md:hidden transition-opacity duration-300 backdrop-blur-sm"
        />
      )}
    </div>
  )
}
