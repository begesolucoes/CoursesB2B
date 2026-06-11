interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default function TenantAdminDashboardPage({ params }: PageProps) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800">Painel do RH - {params.tenant_slug.toUpperCase()}</h1>
      <p className="text-slate-600 mt-2">Gestão de cursos, alunos e métricas corporativas.</p>
    </div>
  )
}
