interface PageProps {
  params: {
    tenant_slug: string
    enrollmentId: string
  }
}

export default function TenantSCORMPlayerPage({ params }: PageProps) {
  return (
    <div className="w-screen h-screen flex flex-col bg-slate-900 text-white">
      <div className="p-4 bg-slate-800 flex justify-between items-center">
        <span>Player SCORM 1.2 - Matrícula: {params.enrollmentId}</span>
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm">
          Salvar e Sair
        </button>
      </div>
      <div className="flex-1 bg-slate-950 flex items-center justify-center">
        {/* Aqui será carregado o iframe do curso SCORM */}
        <p className="text-slate-400">[Área de Exibição do Curso SCORM]</p>
      </div>
    </div>
  )
}
