import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Building2, Users, BookOpen, CheckCircle, XCircle, ArrowRight, Activity, Plus } from 'lucide-react'

export const revalidate = 0 // Força revalidação em cada requisição (sem cache)

export default async function SuperadminDashboardPage() {
  // Busca estatísticas diretamente do banco de dados (Server-side)
  const totalTenants = await prisma.tenant.count()
  const totalUsers = await prisma.user.count({ where: { role: 'USER' } })
  const totalCourses = await prisma.course.count()

  // Busca os últimos 5 inquilinos cadastrados
  const recentTenants = await prisma.tenant.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { users: true, courses: true }
      }
    }
  })

  // Checa status das integrações pelas variáveis de ambiente
  const isResendConfigured = !!process.env.RESEND_API_KEY
  const isR2Configured = !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  )

  const stats = [
    {
      title: 'Empresas Ativas',
      value: totalTenants,
      description: 'Tenants com acesso ao sistema',
      icon: Building2,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Alunos Cadastrados',
      value: totalUsers,
      description: 'Total de colaboradores matriculados',
      icon: Users,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
    },
    {
      title: 'Cursos SCORM',
      value: totalCourses,
      description: 'Treinamentos publicados',
      icon: BookOpen,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            Olá, Administrador Global!
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Gerencie o ecossistema LMS, monitore integrações e controle acessos de clientes.
          </p>
        </div>
        <Link
          href="/superadmin/tenants"
          className="self-start md:self-auto px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Empresa</span>
        </Link>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
                  {stat.value}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1.5">
                  {stat.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenants List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">Últimas Empresas Adicionadas</h3>
              <Link
                href="/superadmin/tenants"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5"
              >
                <span>Ver todas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {recentTenants.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-medium">
                  Nenhuma empresa cadastrada no banco de dados.
                </div>
              ) : (
                recentTenants.map((tenant) => (
                  <div key={tenant.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{tenant.name}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{tenant.slug}.localhost:3000</p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-full">
                        {tenant._count.users} {tenant._count.users === 1 ? 'colaborador' : 'colaboradores'}
                      </span>
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                        {tenant._count.courses} {tenant._count.courses === 1 ? 'curso' : 'cursos'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Listando os últimos registros cadastrados</span>
            <span className="font-bold text-indigo-600">LMS Multi-tenant</span>
          </div>
        </div>

        {/* Integration Status Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="h-5 w-5 text-indigo-500" />
              <h3 className="font-extrabold text-slate-800 text-base">Status da Infraestrutura</h3>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Verifique o status das integrações externas configuradas nas variáveis de ambiente.
            </p>

            <div className="space-y-3 pt-2">
              {/* Banco de dados */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Banco de Dados (PostgreSQL)</span>
                </div>
                <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                  <CheckCircle className="h-4 w-4 fill-green-50 text-green-600" />
                  <span>Online</span>
                </div>
              </div>

              {/* Cloudflare R2 */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">Storage Cloudflare R2</span>
                </div>
                {isR2Configured ? (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                    <CheckCircle className="h-4 w-4 fill-green-50 text-green-600" />
                    <span>Conectado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
                    <XCircle className="h-4 w-4 fill-red-50 text-red-600" />
                    <span>Incompleto</span>
                  </div>
                )}
              </div>

              {/* Resend */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700">E-mails (Resend API)</span>
                </div>
                {isResendConfigured ? (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                    <CheckCircle className="h-4 w-4 fill-green-50 text-green-600" />
                    <span>Ativo</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
                    <XCircle className="h-4 w-4 fill-red-50 text-red-600" />
                    <span>Inativo</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold text-center border-t border-slate-100 pt-4">
            Plataforma LMS SCORM v1.0.0
          </div>
        </div>
      </div>
    </div>
  )
}
