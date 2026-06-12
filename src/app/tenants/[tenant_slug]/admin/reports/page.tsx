import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Calendar, User, BookOpen, Award, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export const revalidate = 0 // Sempre atualizado

interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default async function TenantAdminReportsPage({ params }: PageProps) {
  // 1. Busca o tenant correspondente para obter o ID
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenant_slug }
  })

  if (!tenant) {
    notFound()
  }

  // 2. Busca todas as matrículas da empresa para auditoria (relatórios)
  const enrollments = await prisma.enrollment.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: true,
      course: true,
      attempts: {
        orderBy: { attemptNumber: 'desc' },
        take: 1
      }
    },
    orderBy: {
      enrolledAt: 'desc'
    }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Relatórios & Auditoria de Progresso
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-medium">
          Monitore o desempenho dos alunos nos cursos, notas de tentativas e datas de conclusão de certificados.
        </p>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {enrollments.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center justify-center gap-3 font-medium text-slate-400">
            <Award className="h-12 w-12 text-slate-300" />
            <span>Nenhum dado de progresso disponível no momento.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Curso</th>
                  <th className="px-6 py-4">Progresso</th>
                  <th className="px-6 py-4 text-center">Nota Máxima</th>
                  <th className="px-6 py-4">Último Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {enrollments.map((enr) => {
                  const latestAttempt = enr.attempts[0]
                  
                  return (
                    <tr key={enr.id} className="hover:bg-slate-50/50 transition">
                      
                      {/* Colaborador */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <User className="h-4 w-4 text-slate-400 shrink-0" />
                          <div>
                            <p className="text-slate-850 font-bold leading-tight">{enr.user.name}</p>
                            <p className="text-[10px] text-slate-450 mt-0.5">{enr.user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Curso */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="text-slate-700 max-w-[200px] truncate block" title={enr.course.title}>
                            {enr.course.title}
                          </span>
                        </div>
                      </td>

                      {/* Progresso (Status) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 w-fit ${
                            enr.status === 'COMPLETED'
                              ? 'bg-green-50 text-green-700 border-green-100'
                              : enr.status === 'IN_PROGRESS'
                              ? 'bg-sky-50 text-sky-700 border-sky-100'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {enr.status === 'COMPLETED' ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                <span>Concluído</span>
                              </>
                            ) : enr.status === 'IN_PROGRESS' ? (
                              <>
                                <RefreshCw className="h-3 w-3 text-sky-600 animate-spin" />
                                <span>Em Progresso</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-slate-450" />
                                <span>Não Iniciado</span>
                              </>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Nota Maxima */}
                      <td className="px-6 py-4 text-center font-mono text-slate-800">
                        {latestAttempt ? (
                          <span className="font-extrabold text-sm text-slate-800">
                            {latestAttempt.scoreRaw.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium italic text-xs">--</span>
                        )}
                      </td>

                      {/* Ultimo Acesso */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {latestAttempt ? (
                              new Date(latestAttempt.lastAccessed).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : (
                              new Date(enr.enrolledAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              }) + ' (Criado)'
                            )}
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
    </div>
  )
}
