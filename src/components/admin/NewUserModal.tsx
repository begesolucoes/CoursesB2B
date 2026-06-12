'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, ShieldAlert, Sparkles, User, Mail, BookOpen } from 'lucide-react'

interface Course {
  id: string
  title: string
}

interface NewUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tenantId: string
}

export default function NewUserModal({ isOpen, onClose, onSuccess, tenantId }: NewUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [courseId, setCourseId] = useState('')
  
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)

  // Carrega os cursos disponíveis da empresa quando o modal abre
  useEffect(() => {
    if (isOpen && tenantId) {
      const fetchCourses = async () => {
        setLoadingCourses(true)
        try {
          const res = await fetch(`/api/admin/courses?tenantId=${tenantId}`)
          if (res.ok) {
            const data = await res.json()
            setCourses(data)
          }
        } catch (err) {
          console.error('Erro ao carregar cursos:', err)
        } finally {
          setLoadingCourses(false)
        }
      }
      fetchCourses()
    }
  }, [isOpen, tenantId])

  const handleCopyPassword = () => {
    if (successData?.user?.tempPassword) {
      navigator.clipboard.writeText(successData.user.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name || !email) {
      setError('Nome e e-mail são obrigatórios.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          courseId: courseId || undefined,
          tenantId
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar colaborador.')
      }

      setSuccessData(data)
      onSuccess()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Falha ao conectar ao servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setEmail('')
    setCourseId('')
    setError('')
    setSuccessData(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div onClick={handleClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-lg">Cadastrar Colaborador</h3>
          </div>
          <button 
            onClick={handleClose} 
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 font-medium animate-shake">
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {!successData ? (
            /* FORMULÁRIO DE CADASTRO */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Nome */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex: João da Silva"
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="colaborador@empresa.com"
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  O colaborador usará este e-mail para logar no sistema.
                </p>
              </div>

              {/* Matricular em Curso (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Matricular Inicialmente em (Opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                  </div>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    disabled={loadingCourses}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 bg-white transition appearance-none"
                  >
                    <option value="">-- Não matricular em nenhum curso por enquanto --</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-xs">▼</span>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-1.5"
                >
                  {loading ? 'Cadastrando...' : 'Cadastrar e Matricular'}
                </button>
              </div>

            </form>
          ) : (
            /* TELA DE SUCESSO E EXIBIÇÃO DE SENHA PROVISÓRIA */
            <div className="text-center py-4 space-y-5 animate-scale-in">
              <div className="h-16 w-16 bg-green-50 text-green-500 border border-green-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-xl">Cadastro Concluído!</h4>
                <p className="text-sm text-slate-500 max-w-[340px] mx-auto">
                  O colaborador <strong>{successData.user?.name}</strong> foi adicionado com sucesso.
                </p>
              </div>

              {/* Box de Credenciais temporárias */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-left max-w-sm mx-auto space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Credenciais de Acesso Provisórias
                </h5>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Login (E-mail)</span>
                  <span className="text-sm font-semibold text-slate-700 font-mono break-all">
                    {successData.user?.email}
                  </span>
                </div>
                
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Senha Temporária</span>
                  <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg p-2.5 mt-1 font-mono text-sm font-bold text-slate-800">
                    <span className="tracking-widest">{successData.user?.tempPassword}</span>
                    <button
                      onClick={handleCopyPassword}
                      className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                      title="Copiar senha"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status do envio de e-mail */}
              <div className="text-xs flex items-center justify-center gap-1.5 font-medium">
                {successData.emailSent ? (
                  <span className="text-green-600">✓ E-mail de credenciais enviado para o aluno via Resend.</span>
                ) : (
                  <span className="text-amber-600">⚠️ E-mail não enviado (verifique a conta do Resend).</span>
                )}
              </div>

              <div className="pt-4 max-w-sm mx-auto">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition text-sm shadow-sm"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
