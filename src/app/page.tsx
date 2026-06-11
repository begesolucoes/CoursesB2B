export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          Plataforma SCORM LMS
        </h1>
        <p className="text-xl text-slate-400 max-w-[600px] text-center mt-2">
          Gestão de treinamentos corporativos de alta performance com suporte nativo a SCORM 1.2 e Multi-tenancy.
        </p>
      </div>
    </main>
  )
}
