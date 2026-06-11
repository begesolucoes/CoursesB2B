interface PageProps {
  params: {
    tenant_slug: string
  }
}

export default function TenantLoginPage({ params }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-xl font-bold text-slate-800 text-center">
          Acesso à Plataforma - {params.tenant_slug.toUpperCase()}
        </h1>
        <p className="text-slate-500 text-sm text-center mt-1">Insira suas credenciais para continuar.</p>
      </div>
    </div>
  )
}
