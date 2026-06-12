import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TenantUsersClient from '@/components/admin/TenantUsersClient'

export const revalidate = 0 // Sempre atualizado

interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default async function TenantAdminUsersPage({ params }: PageProps) {
  // 1. Busca o tenant correspondente para obter o ID
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenant_slug }
  })

  if (!tenant) {
    notFound()
  }

  // 2. Busca todos os colaboradores (USER) da empresa no banco
  const users = await prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: 'USER'
    },
    include: {
      enrollments: {
        include: {
          course: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Gestão de Colaboradores (Alunos)
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-medium">
          Matricule colaboradores em treinamentos corporativos e acompanhe o andamento individual.
        </p>
      </div>

      <TenantUsersClient 
        tenantId={tenant.id} 
        initialUsers={users} 
      />
    </div>
  )
}
