'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, ShieldAlert } from 'lucide-react'

interface TenantLoginFormProps {
  tenantName: string
  tenantSlug: string
  primaryColor?: string
}

export default function TenantLoginForm({ tenantName, tenantSlug, primaryColor = '#3b82f6' }: TenantLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        setError('E-mail ou senha inválidos.')
        setLoading(false)
        return
      }

      // Login bem-sucedido, busca a sessão ativa
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()

      if (!session || !session.user) {
        setError('Falha ao inicializar sessão.')
        setLoading(false)
        return
      }

      const { role, tenantSlug: userTenantSlug } = session.user

      // Validação: Garante que um usuário de outra empresa não consiga logar neste subdomínio
      if (role !== 'SUPERADMIN' && userTenantSlug !== tenantSlug) {
        setError('Este usuário não pertence a esta empresa.')
        setLoading(false)
        // Faz logout silencioso para limpar a sessão incorreta
        await fetch('/api/auth/signout', { method: 'POST' })
        return
      }

      // Redirecionamento baseado no papel
      if (role === 'SUPERADMIN') {
        window.location.href = '/superadmin'
      } else if (role === 'RH') {
        window.location.href = '/admin'
      } else if (role === 'USER') {
        window.location.href = '/dashboard'
      }

    } catch (err) {
      console.error(err)
      setError('Ocorreu um erro ao processar o login.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6">
      
      {/* Cabeçalho */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Acesso à Plataforma
        </h1>
        <p className="text-sm font-semibold text-slate-400">
          {tenantName}
        </p>
      </div>

      {/* Alerta de Erro */}
      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100 font-medium">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            E-mail
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seu-nome@empresa.com"
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
            />
          </div>
        </div>

        {/* Senha */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
            />
          </div>
        </div>

        {/* Botão de Enviar */}
        <button
          type="submit"
          disabled={loading}
          style={!loading ? { backgroundColor: primaryColor } : undefined}
          className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl transition shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Entrando...</span>
            </>
          ) : (
            <span>Entrar na plataforma</span>
          )}
        </button>

      </form>
    </div>
  )
}
