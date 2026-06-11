interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default function TenantAdminCoursesPage({ params }: PageProps) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800">Meus Cursos Cadastrados</h1>
      <p className="text-slate-600 mt-2">Empresa: {params.tenant_slug.toUpperCase()}</p>
    </div>
  )
}
