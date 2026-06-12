import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SuperadminSidebar from '@/components/superadmin/SuperadminSidebar'

interface LayoutProps {
  children: React.ReactNode
}

export default async function SuperadminLayout({ children }: LayoutProps) {
  const session = await getServerSession(authOptions)

  // Segurança de acesso global para todas as rotas do superadmin
  if (!session || session.user.role !== 'SUPERADMIN') {
    redirect('/login')
  }

  return (
    <SuperadminSidebar
      userName={session.user.name || 'Superadmin'}
      userEmail={session.user.email || 'admin@plataforma.com'}
    >
      {children}
    </SuperadminSidebar>
  )
}
