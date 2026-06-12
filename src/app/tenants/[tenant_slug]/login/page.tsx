import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TenantLoginForm from '@/components/auth/TenantLoginForm'

interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default async function TenantLoginPage({ params }: PageProps) {
  // 1. Busca o tenant correspondente para obter informações de customização
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenant_slug }
  })

  if (!tenant) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <TenantLoginForm
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        primaryColor={tenant.primaryColor}
      />
    </div>
  )
}
