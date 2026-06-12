'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Building2, Globe, Users, BookOpen, Calendar, RefreshCw } from 'lucide-react'
import NewTenantModal from '@/components/superadmin/NewTenantModal'

interface Tenant {
  id: string
  name: string
  slug: string
  createdAt: string
  _count: {
    users: number
    courses: number
  }
}

export default function SuperadminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Função para buscar os tenants da API
  const fetchTenants = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/superadmin/tenants')
      if (!res.ok) {
        throw new Error('Falha ao carregar lista de empresas.')
      }
      const data = await res.json()
      setTenants(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  // Filtro de pesquisa
  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(search.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Gerenciamento de Empresas (Tenants)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">
            Cadastre novas empresas clientes no sistema e gerencie as contas ativas.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-auto px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Empresa</span>
        </button>
      </div>

      {/* Control Bar (Search & Refresh) */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por empresa ou subdomínio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 bg-white transition"
          />
        </div>
        <button
          onClick={fetchTenants}
          className="p-2 border border-slate-200 rounded-xl bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition"
          title="Atualizar lista"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table / List Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading && tenants.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 font-semibold">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
            <span>Carregando empresas...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 font-semibold">
            <span>⚠️ Ocorreu um erro: {error}</span>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 font-medium">
            <Building2 className="h-12 w-12 text-slate-300" />
            <span>Nenhuma empresa encontrada.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Subdomínio (URL)</th>
                  <th className="px-6 py-4 text-center">Colaboradores</th>
                  <th className="px-6 py-4 text-center">Cursos</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition">
                    {/* Empresa Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-sm">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-slate-800 font-bold">{tenant.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {tenant.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Subdominio */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs bg-slate-50 border border-slate-150 px-2 py-1 rounded-lg w-fit">
                        <Globe className="h-3.5 w-3.5 text-slate-400" />
                        <span>{tenant.slug}.localhost:3000</span>
                      </div>
                    </td>

                    {/* Total Users */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>{tenant._count.users}</span>
                      </div>
                    </td>

                    {/* Total Courses */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-bold">
                        <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{tenant._count.courses}</span>
                      </div>
                    </td>

                    {/* CreatedAt */}
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {new Date(tenant.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cadastro Modal */}
      <NewTenantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTenants}
      />
    </div>
  )
}
