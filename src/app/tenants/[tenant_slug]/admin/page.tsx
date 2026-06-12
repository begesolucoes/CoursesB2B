import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, BookOpen, GraduationCap, ArrowRight, Activity, Plus, Award } from 'lucide-react'

export const revalidate = 0 // Força revalidação para sempre puxar dados novos

interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default async function TenantAdminDashboardPage({ params }: PageProps) {
  // 1. Busca o tenant correspondente para obter o ID
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenant_slug }
  })

  if (!tenant) {
    notFound()
  }

  // 2. Busca estatísticas da empresa (Server-side)
  const totalCollaborators = await prisma.user.count({
    where: { tenantId: tenant.id, role: 'USER' }
  })
  
  const totalCourses = await prisma.course.count({
    where: { tenantId: tenant.id }
  })

  const inProgressEnrollments = await prisma.enrollment.count({
    where: { tenantId: tenant.id, status: 'IN_PROGRESS' }
  })

  const completedEnrollments = await prisma.enrollment.count({
    where: { tenantId: tenant.id, status: 'COMPLETED' }
  })

  // 3. Busca as últimas 5 matrículas realizadas
  const recentEnrollments = await prisma.enrollment.findMany({
    where: { tenantId: tenant.id },
    take: 5,
    orderBy: { enrolledAt: 'desc' },
    include: {
      user: true,
      course: true
    }
  })

  const stats = [
    {
      title: 'Total de Colaboradores',
      value: totalCollaborators,
      description: 'Funcionários cadastrados no portal',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Cursos SCORM',
      value: totalCourses,
      description: 'Treinamentos publicados no catálogo',
      icon: BookOpen,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Estudos em Progresso',
      value: inProgressEnrollments,
      description: 'Matrículas iniciadas e ativas',
      icon: Activity,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
    },
    {
      title: 'Treinamentos Concluídos',
      value: completedEnrollments,
      description: 'Certificados emitidos pela plataforma',
      icon: Award,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header de Boas-Vindas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Olá, Gestor de Treinamento!
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Gerencie colaboradores, acompanhe o progresso de estudos e adicione novos cursos para a <span className="font-bold text-slate-700">{tenant.name}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <Link
            href="/admin/courses/new"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Curso</span>
          </Link>
        </div>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:shadow-md transition duration-200"
            >
              <div className={`p-3.5 rounded-xl border ${stat.color} shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {stat.title}
                </p>
                <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
                  {stat.value}
                </h3>
                <p className="text-[10px] font-semibold text-slate-500 mt-1.5 leading-tight">
                  {stat.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Atividades Recentes (Matrículas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">Atividades Recentes de Matrícula</h3>
              <Link
                href="/admin/users"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5"
              >
                <span>Ver colaboradores</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentEnrollments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  Nenhum colaborador matriculado recentemente neste portal.
                </div>
              ) : (
                recentEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{enrollment.user.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Matriculado no curso: <span className="font-semibold text-indigo-600">{enrollment.course.title}</span></p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className={`px-2.5 py-1 rounded-full border ${
                        enrollment.status === 'COMPLETED'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : enrollment.status === 'IN_PROGRESS'
                          ? 'bg-sky-50 text-sky-700 border-sky-100'
                          : 'bg-slate-50 text-slate-600 border-slate-150'
                      }`}>
                        {enrollment.status === 'COMPLETED'
                          ? 'Concluído'
                          : enrollment.status === 'IN_PROGRESS'
                          ? 'Em Progresso'
                          : 'Não Iniciado'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Últimas movimentações de matriculados</span>
            <span className="font-bold text-indigo-600">{tenant.name}</span>
          </div>
        </div>

        {/* Branding Preview / Custom Colors Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="h-5 w-5 text-indigo-500" />
              <h3 className="font-extrabold text-slate-800 text-base">Identidade Visual</h3>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Sua plataforma está personalizada com os seguintes elementos visuais de marca:
            </p>

            <div className="space-y-4 pt-2">
              {/* Cor Principal */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-600 block">Cor Principal de Destaque</span>
                <div className="flex items-center gap-2.5">
                  <div 
                    style={{ backgroundColor: tenant.primaryColor }}
                    className="h-8 w-16 rounded-lg shadow-sm border border-slate-300/40"
                  />
                  <span className="text-sm font-mono font-bold text-slate-700 uppercase">{tenant.primaryColor}</span>
                </div>
              </div>

              {/* Logotipo */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-600 block">Visualização do Logotipo</span>
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt={tenant.name} className="h-10 max-w-full object-contain mx-auto bg-white p-1 rounded border border-slate-200/50" />
                ) : (
                  <div className="text-center py-2 text-xs font-medium text-slate-400 italic">
                    Nenhum logotipo enviado. Usando iniciais como padrão.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold text-center border-t border-slate-100 pt-4">
            Customização Corporativa LMS
          </div>
        </div>
      </div>

    </div>
  )
}
