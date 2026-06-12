'use client'

import { useState } from 'react'
import { X, Copy, Check, ShieldAlert, Sparkles, Building2, User, Mail, Link as LinkIcon } from 'lucide-react'

interface NewTenantModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function NewTenantModal({ isOpen, onClose, onSuccess }: NewTenantModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [hrName, setHrName] = useState('')
  const [hrEmail, setHrEmail] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState<any | null>(null)
  const [copied, setCopied] = useState(false)

  // Auto-gerador de slug amigável enquanto digita o nome da empresa
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    if (!successData) {
      const generatedSlug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .trim()
        .replace(/\s+/g, '-') // Substitui espaços por hífen
      setSlug(generatedSlug)
    }
  }

  const handleCopyPassword = () => {
    if (successData?.hrUser?.tempPassword) {
      navigator.clipboard.writeText(successData.hrUser.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name || !slug || !hrName || !hrEmail) {
      setError('Todos os campos são de preenchimento obrigatório.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          slug,
          hrName,
          hrEmail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro inesperado ao cadastrar empresa.')
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
    // Reseta states ao fechar
    setName('')
    setSlug('')
    setHrName('')
    setHrEmail('')
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
            <h3 className="font-bold text-slate-800 text-lg">Nova Empresa Cliente</h3>
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
            <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 font-medium">
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {!successData ? (
            /* FORMULARIO DE CADASTRO */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Seção 1: Dados da Empresa */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                  Dados da Empresa
                </h4>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome Comercial
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      required
                      placeholder="Ex: Empresa Exemplo Ltda"
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Subdomínio / Slug (URL de Acesso)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LinkIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      required
                      placeholder="exemplo-empresa"
                      className="w-full pl-10 pr-20 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition font-mono"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-xs font-medium text-slate-400">.lms.com</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    URL de acesso: <span className="font-mono text-indigo-600">{slug || 'slug'}.localhost:3000</span>
                  </p>
                </div>
              </div>

              {/* Seção 2: Administrador do RH */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
                  Gestor do RH (Admin da Empresa)
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome Completo do Gestor
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={hrName}
                      onChange={(e) => setHrName(e.target.value)}
                      required
                      placeholder="Ex: Bruno Silva"
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    E-mail do Gestor
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={hrEmail}
                      onChange={(e) => setHrEmail(e.target.value)}
                      required
                      placeholder="gestor@empresa.com"
                      className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
                    />
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
                  {loading ? 'Cadastrando...' : 'Cadastrar Empresa'}
                </button>
              </div>

            </form>
          ) : (
            /* TELA DE SUCESSO E EXIBIÇÃO DE SENHA TEMPORÁRIA */
            <div className="text-center py-4 space-y-5">
              <div className="h-16 w-16 bg-green-50 text-green-500 border border-green-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-xl">Empresa Criada!</h4>
                <p className="text-sm text-slate-500 max-w-[340px] mx-auto">
                  A empresa <strong>{successData.tenant?.name}</strong> foi configurada no sistema.
                </p>
              </div>

              {/* Box de Credenciais temporárias */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 text-left max-w-sm mx-auto space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Dados de Acesso Provisórios
                </h5>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Login (E-mail)</span>
                  <span className="text-sm font-semibold text-slate-700 font-mono break-all">
                    {successData.hrUser?.email}
                  </span>
                </div>
                
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Senha Temporária</span>
                  <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg p-2.5 mt-1 font-mono text-sm font-bold text-slate-800">
                    <span className="tracking-widest">{successData.hrUser?.tempPassword}</span>
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
                  <span className="text-green-600">✓ E-mail de onboarding enviado via Resend.</span>
                ) : (
                  <span className="text-amber-600">⚠️ E-mail não enviado (verifique a Key do Resend).</span>
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
