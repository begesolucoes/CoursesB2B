import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Layers, Users, Calendar, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'

export const revalidate = 0 // Sempre atualizado

interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default async function TenantAdminCoursesPage({ params }: PageProps) {
  // 1. Busca o tenant correspondente para obter o ID
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenant_slug }
  })

  if (!tenant) {
    notFound()
  }

  // 2. Busca todos os cursos cadastrados do tenant
  const courses = await prisma.course.findMany({
    where: { tenantId: tenant.id },
    include: {
      scormPackage: true,
      _count: {
        select: { enrollments: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Catálogo de Treinamentos (Cursos)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">
            Cadastre novos treinamentos corporativos e faça o upload de arquivos SCORM.
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="self-start sm:self-auto px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Curso</span>
        </Link>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {courses.length === 0 ? (
          <div className="p-16 text-center max-w-sm mx-auto flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 bg-slate-50 border border-slate-150 text-slate-400 rounded-2xl flex items-center justify-center shadow-sm">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">Sem cursos publicados</h3>
              <p className="text-sm text-slate-400 mt-1 font-semibold leading-relaxed">
                Você ainda não possui nenhum curso cadastrado para a sua equipe nesta plataforma.
              </p>
            </div>
            <Link
              href="/admin/courses/new"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-sm shadow-md hover:shadow-indigo-500/20"
            >
              Começar Agora
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Título do Curso</th>
                  <th className="px-6 py-4">Pacote SCORM</th>
                  <th className="px-6 py-4 text-center">Matriculados</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {courses.map((course) => {
                  const hasPackage = !!course.scormPackage

                  return (
                    <tr key={course.id} className="hover:bg-slate-50/50 transition">
                      
                      {/* Title & Desc */}
                      <td className="px-6 py-4 max-w-xs md:max-w-md">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-sm shadow-sm shrink-0 mt-0.5">
                            <Layers className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-slate-800 font-bold truncate" title={course.title}>
                              {course.title}
                            </p>
                            <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5" title={course.description || ''}>
                              {course.description || 'Nenhuma descrição fornecida.'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* SCORM Status */}
                      <td className="px-6 py-4">
                        {hasPackage ? (
                          <div className="flex items-center gap-1.5 text-green-700 text-xs font-bold bg-green-50 border border-green-100 px-2.5 py-1 rounded-full w-fit">
                            <CheckCircle className="h-4 w-4 fill-green-50 text-green-600 shrink-0" />
                            <span>SCORM {course.scormPackage?.scormVersion} Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full w-fit">
                            <AlertTriangle className="h-4 w-4 fill-amber-50 text-amber-600 shrink-0" />
                            <span>Pendente (.zip)</span>
                          </div>
                        )}
                      </td>

                      {/* Total Enrolled */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          <span>{course._count.enrollments}</span>
                        </div>
                      </td>

                      {/* Data de Cadastro */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {new Date(course.createdAt).toLocaleDateString('pt-BR', {
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
    </div>
  )
}
