'use client'

import { useState } from 'react'
import { Plus, Search, User, Mail, BookOpen, RefreshCw, Calendar, Eye } from 'lucide-react'
import NewUserModal from '@/components/admin/NewUserModal'

interface UserEnrollment {
  id: string
  status: string
  course: {
    id: string
    title: string
  }
}

interface UserData {
  id: string
  name: string
  email: string
  createdAt: any
  enrollments: UserEnrollment[]
}

interface TenantUsersClientProps {
  tenantId: string
  initialUsers: UserData[]
}

export default function TenantUsersClient({ tenantId, initialUsers }: TenantUsersClientProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?tenantId=${tenantId}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (err) {
      console.error('Erro ao recarregar colaboradores:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar colaborador por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 bg-white transition"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handleRefresh}
            className="p-2 border border-slate-200 rounded-xl bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shrink-0"
            title="Atualizar lista"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Matricular Aluno</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2 font-medium">
            <User className="h-12 w-12 text-slate-350" />
            <span>Nenhum colaborador encontrado.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4">Cursos Vinculados</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {filteredUsers.map((colaborador) => {
                  const enrollment = colaborador.enrollments[0] // exibe a primeira matrícula como principal
                  
                  return (
                    <tr key={colaborador.id} className="hover:bg-slate-50/50 transition">
                      
                      {/* Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shadow-sm">
                            {colaborador.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-slate-800 font-bold">{colaborador.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {colaborador.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{colaborador.email}</span>
                        </div>
                      </td>

                      {/* Course Status */}
                      <td className="px-6 py-4">
                        {colaborador.enrollments.length === 0 ? (
                          <span className="text-xs font-medium text-slate-400 italic">
                            Nenhum curso matriculado
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {colaborador.enrollments.map((enr) => (
                              <div key={enr.id} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 max-w-[200px] truncate block" title={enr.course.title}>
                                  {enr.course.title}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                                  enr.status === 'COMPLETED'
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : enr.status === 'IN_PROGRESS'
                                    ? 'bg-sky-50 text-sky-700 border-sky-100'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {enr.status === 'COMPLETED'
                                    ? 'Concluído'
                                    : enr.status === 'IN_PROGRESS'
                                    ? 'Em Progresso'
                                    : 'Não Iniciado'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Data de Cadastro */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {new Date(colaborador.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Nova Matrícula */}
      <NewUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        tenantId={tenantId}
      />
    </div>
  )
}
