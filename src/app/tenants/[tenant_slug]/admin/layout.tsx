import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import TenantAdminSidebar from '@/components/admin/TenantAdminSidebar'

interface LayoutProps {
  children: React.ReactNode
  params: {
    tenant_slug: string
  }
}

export default async function TenantAdminLayout({ children, params }: LayoutProps) {
  const session = await getServerSession(authOptions)

  // 1. Valida se o usuário está logado
  if (!session || !session.user) {
    redirect('/login')
  }

  const { role, tenantSlug } = session.user

  // 2. Trava de segurança Multi-tenant:
  // Superadmin pode acessar qualquer um. Gestor de RH só pode acessar o seu próprio tenantSlug.
  const isSuperadmin = role === 'SUPERADMIN'
  const isAuthorizedRH = role === 'RH' && tenantSlug === params.tenant_slug

  if (!isSuperadmin && !isAuthorizedRH) {
    // Redireciona para o login caso não tenha autorização para este tenant
    redirect('/login')
  }

  // 3. Carrega o branding do Tenant (Logotipo e cor da marca) do banco
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenant_slug }
  })

  if (!tenant) {
    notFound()
  }

  return (
    <TenantAdminSidebar
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      logoUrl={tenant.logoUrl}
      primaryColor={tenant.primaryColor}
      userName={session.user.name || 'Gestor'}
      userEmail={session.user.email || ''}
    >
      {children}
    </TenantAdminSidebar>
  )
}
