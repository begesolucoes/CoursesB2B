'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  FileArchive, 
  UploadCloud, 
  CheckCircle, 
  Sparkles, 
  Loader2, 
  Building, 
  BookOpen,
  ChevronRight
} from 'lucide-react'

export default function TenantAdminNewCoursePage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenant_slug as string

  // Etapas: 'metadata' | 'upload' | 'processing' | 'success'
  const [step, setStep] = useState<'metadata' | 'upload' | 'processing' | 'success'>('metadata')

  // Dados do Curso
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [courseId, setCourseId] = useState('')

  // Estado do Upload
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')

  // Estado de Processamento (Descompactação)
  const [processingStatus, setProcessingStatus] = useState('')
  const [entryPoint, setEntryPoint] = useState('')

  // Erros e Loading geral
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ETAPA 1: Cadastrar Metadados do Curso
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!title) {
      setError('O título do curso é obrigatório.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar informações do curso.')
      }

      setCourseId(data.id)
      setStep('upload')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Falha ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  // ETAPA 2: Upload direto para o Cloudflare R2 usando Presigned URL
  const handleUploadSCORM = async () => {
    if (!file || !courseId) {
      setError('Por favor, selecione um arquivo .zip válido.')
      return
    }

    setError('')
    setLoading(true)
    setUploadProgress(0)
    setUploadStatus('Obtendo credenciais de upload seguro...')

    try {
      // 1. Solicita a Presigned URL para o Backend
      const presignedRes = await fetch('/api/admin/courses/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          fileName: file.name,
          fileType: file.type || 'application/zip',
        }),
      })

      const presignedData = await presignedRes.json()

      if (!presignedRes.ok) {
        throw new Error(presignedData.error || 'Erro ao gerar credenciais de upload.')
      }

      const { uploadUrl, bucketKey } = presignedData

      // 2. Faz o upload físico direto do Browser para o Cloudflare R2 usando XMLHttpRequest
      // Usamos XHR ao invés de fetch para conseguir rastrear o progresso do upload
      setUploadStatus('Enviando pacote para o storage Cloudflare R2...')

      const xhr = new XMLHttpRequest()
      
      xhr.open('PUT', uploadUrl, true)
      xhr.setRequestHeader('Content-Type', file.type || 'application/zip')

      // Rastreamento de progresso
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percent)
        }
      })

      xhr.onreadystatechange = async () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || xhr.status === 201) {
            // Upload concluído com sucesso, avança para processamento
            setStep('processing')
            handleProcessSCORM(bucketKey)
          } else {
            setLoading(false)
            setError('Falha ao enviar arquivo para o storage (R2).')
          }
        }
      }

      xhr.onerror = () => {
        setLoading(false)
        setError('Ocorreu um erro de rede durante o upload.')
      }

      xhr.send(file)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Falha ao realizar upload do arquivo.')
      setLoading(false)
    }
  }

  // ETAPA 3: Processamento do SCORM (Descompactação e manifesto)
  const handleProcessSCORM = async (bucketKey: string) => {
    setProcessingStatus('Descompactando pacote .zip e lendo manifesto imsmanifest.xml...')
    
    try {
      const res = await fetch('/api/admin/courses/unzip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          bucketKey,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao processar e descompactar o arquivo SCORM.')
      }

      setEntryPoint(data.entryPoint)
      setStep('success')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Erro ao processar pacote SCORM.')
      setStep('upload') // retorna para tentar o upload novamente
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      setFile(droppedFile)
      setError('')
    } else {
      setError('Por favor, envie apenas arquivos com extensão .zip.')
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      
      {/* Voltar */}
      <Link
        href="/admin/courses"
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold transition"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar para Cursos</span>
      </Link>

      {/* Título */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Cadastrar Novo Curso SCORM
        </h1>
        <p className="text-slate-500 text-sm mt-0.5 font-medium">
          Crie um curso e envie o pacote compactado no formato SCORM 1.2.
        </p>
      </div>

      {/* Marcador de Etapas visual (Stepper) */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-slate-100 shadow-sm text-xs font-bold text-slate-400">
        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 rounded-full flex items-center justify-center border text-[10px] ${
            step === 'metadata' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            {step !== 'metadata' ? '✓' : '1'}
          </span>
          <span className={step === 'metadata' ? 'text-slate-800 font-extrabold' : 'text-slate-400'}>
            Metadados do Curso
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300" />
        
        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 rounded-full flex items-center justify-center border text-[10px] ${
            step === 'upload' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' : (step === 'processing' || step === 'success') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-400'
          }`}>
            {(step === 'processing' || step === 'success') ? '✓' : '2'}
          </span>
          <span className={step === 'upload' ? 'text-slate-800 font-extrabold' : 'text-slate-400'}>
            Upload do Pacote ZIP
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300" />

        <div className="flex items-center gap-2">
          <span className={`h-6 w-6 rounded-full flex items-center justify-center border text-[10px] ${
            step === 'processing' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' : step === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-400'
          }`}>
            {step === 'success' ? '✓' : '3'}
          </span>
          <span className={step === 'processing' || step === 'success' ? 'text-slate-800 font-extrabold' : 'text-slate-400'}>
            Processamento SCORM
          </span>
        </div>
      </div>

      {/* Caixa de Erro */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
          <span className="shrink-0 text-red-500 font-bold">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Card Principal de Conteúdo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8">
        
        {/* ETAPA 1: METADADOS */}
        {step === 'metadata' && (
          <form onSubmit={handleSaveMetadata} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Título do Curso
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: LGPD no Ambiente Corporativo"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Descrição do Treinamento (Opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Treinamento voltado para adequação dos colaboradores às regras da LGPD..."
                rows={4}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 transition resize-none"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-50">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-1.5"
              >
                <span>Continuar para Upload</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 2: UPLOAD ZIP */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-indigo-500 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-400 font-bold block">CURSO CADASTRADO</span>
                <span className="font-extrabold text-slate-700">{title}</span>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors ${
                file ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300 bg-slate-50/20'
              }`}
            >
              {file ? (
                <FileArchive className="h-14 w-14 text-indigo-500 animate-bounce" />
              ) : (
                <UploadCloud className="h-14 w-14 text-slate-350" />
              )}
              
              <div>
                <h4 className="font-extrabold text-slate-700 text-sm">
                  {file ? file.name : 'Arraste o arquivo do curso aqui'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-semibold">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'ou clique para selecionar do computador'}
                </p>
              </div>

              <input
                type="file"
                accept=".zip"
                id="file-upload"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0]
                  if (selected && selected.name.endsWith('.zip')) {
                    setFile(selected)
                    setError('')
                  }
                }}
              />
              
              {!file && (
                <label
                  htmlFor="file-upload"
                  className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer shadow-sm transition"
                >
                  Selecionar ZIP
                </label>
              )}
            </div>

            {/* Aviso sobre Limite R2/SCORM */}
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs font-semibold text-amber-700">
              ⚠️ Apenas pacotes no formato **SCORM 1.2** são suportados. Certifique-se de que o arquivo compactado contém o `imsmanifest.xml` no diretório raiz do ZIP.
            </div>

            {/* Progress Bar (Visible during upload) */}
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    style={{ width: `${uploadProgress}%` }}
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out shadow-sm shadow-indigo-500/20"
                  />
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setStep('metadata')}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition"
              >
                Voltar Ajustar Dados
              </button>
              <button
                onClick={handleUploadSCORM}
                disabled={loading || !file}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-lg shadow-md transition flex items-center gap-1.5"
              >
                {loading ? 'Enviando curso...' : 'Confirmar e Fazer Upload'}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: PROCESSANDO (DESCOMPACTAÇÃO) */}
        {step === 'processing' && (
          <div className="text-center py-8 space-y-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-14 w-14 text-indigo-500 animate-spin" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-800 text-lg">Processando Pacote SCORM</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
                {processingStatus}
              </p>
            </div>

            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest animate-pulse">
              Não feche ou recarregue esta página
            </div>
          </div>
        )}

        {/* ETAPA 4: SUCESSO */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-6 animate-scale-in">
            <div className="h-16 w-16 bg-green-50 text-green-500 border border-green-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="h-8 w-8 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-800 text-xl">Curso Publicado com Sucesso!</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">
                O curso <strong>{title}</strong> foi configurado no storage R2 e o manifesto foi lido corretamente.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 max-w-md mx-auto border border-slate-100 text-left space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Arquivo de Entrada (Entry Point)</span>
                <p className="font-mono font-bold text-indigo-600 mt-0.5">{entryPoint}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Compatibilidade</span>
                <p className="font-semibold text-slate-700 mt-0.5">SCORM 1.2 (Pronto para execução em iframe)</p>
              </div>
            </div>

            <div className="pt-4 max-w-xs mx-auto">
              <Link
                href="/admin/courses"
                className="w-full block py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition text-sm shadow-sm"
              >
                Concluir e Voltar
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
