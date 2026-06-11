'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
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
        redirect: false, // Evita redirecionamento automático do NextAuth para controlarmos via JS
      })

      if (res?.error) {
        setError(res.error || 'E-mail ou senha inválidos.')
        setLoading(false)
        return
      }

      // Login bem-sucedido, busca a sessão ativa para saber o papel do usuário
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()

      if (!session || !session.user) {
        setError('Falha ao inicializar sessão.')
        setLoading(false)
        return
      }

      const role = session.user.role
      const slug = session.user.tenantSlug

      // Redirecionamento dinâmico baseado no perfil
      if (role === 'SUPERADMIN') {
        router.push('/superadmin')
      } else if (role === 'RH') {
        // Redireciona para o subdomínio correspondente da empresa
        const targetUrl = `http://${slug}.localhost:3000/admin`
        window.location.href = targetUrl
      } else if (role === 'USER') {
        // Aluno vai para o dashboard no subdomínio correspondente
        const targetUrl = `http://${slug}.localhost:3000/dashboard`
        window.location.href = targetUrl
      }

    } catch (err) {
      console.error(err)
      setError('Ocorreu um erro ao processar o login.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
          Acesso ao LMS SCORM
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="exemplo@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition disabled:bg-blue-300"
          >
            {loading ? 'Entrando...' : 'Entrar na plataforma'}
          </button>
        </form>
      </div>
    </div>
  )
}
