import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { s3Client } from '@/lib/r2'
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import unzipper from 'unzipper'
import { Readable } from 'stream'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação: gestores do RH ou Superadmin
  if (!session || (session.user.role !== 'RH' && session.user.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { courseId, bucketKey } = body

    if (!courseId || !bucketKey) {
      return NextResponse.json({ error: 'Faltando courseId ou bucketKey.' }, { status: 400 })
    }

    const tenantId = session.user.role === 'RH' 
      ? session.user.tenantId 
      : body.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'ID do inquilino (Tenant) não identificado.' }, { status: 400 })
    }

    const bucketName = process.env.R2_BUCKET_NAME || ''

    // 1. Busca o arquivo zip temporário do R2
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: bucketKey,
    })

    const s3Response = await s3Client.send(getCommand)
    const zipStream = s3Response.Body as Readable

    if (!zipStream) {
      return NextResponse.json({ error: 'Arquivo zip não encontrado no R2.' }, { status: 404 })
    }

    // Variáveis para rastrear o ponto de entrada do SCORM
    let entryPoint = 'index.html'
    const extractPathPrefix = `tenants/${tenantId}/courses/${courseId}/extracted/`

    // 2. Processa o zip em memória usando Streams (unzipper.Parse)
    const zipParser = zipStream.pipe(unzipper.Parse({ forceStream: true }))
    
    // Lista de promises de upload para rodar em paralelo controlado
    const uploadPromises: Promise<any>[] = []

    for await (const entry of zipParser) {
      const fileName = entry.path
      const type = entry.type // 'File' ou 'Directory'

      // Se for diretório, não precisa fazer nada, o R2 cria a estrutura baseada nas chaves dos arquivos
      if (type === 'Directory') {
        entry.autodrain()
        continue
      }

      // Lê o buffer do arquivo
      const fileBuffer = await entry.buffer()

      // Se for o arquivo de manifesto do SCORM, lê o XML para descobrir o entryPoint
      if (fileName.toLowerCase() === 'imsmanifest.xml') {
        const manifestContent = fileBuffer.toString('utf-8')
        
        // Regex para capturar o href da tag <resource> principal do SCORM
        const resourceMatch = manifestContent.match(/<resource[^>]+href="([^"]+)"/i)
        if (resourceMatch && resourceMatch[1]) {
          entryPoint = resourceMatch[1]
          console.log(`[SCORM Parser] Ponto de entrada encontrado: ${entryPoint}`)
        }
      }

      // Prepara a chave final do arquivo descompactado no R2
      const extractedFileKey = `${extractPathPrefix}${fileName}`

      // Define o Content-Type simplificado com base na extensão
      let contentType = 'application/octet-stream'
      if (fileName.endsWith('.html') || fileName.endsWith('.htm')) contentType = 'text/html'
      else if (fileName.endsWith('.js')) contentType = 'application/javascript'
      else if (fileName.endsWith('.css')) contentType = 'text/css'
      else if (fileName.endsWith('.png')) contentType = 'image/png'
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) contentType = 'image/jpeg'
      else if (fileName.endsWith('.xml')) contentType = 'text/xml'
      else if (fileName.endsWith('.svg')) contentType = 'image/svg+xml'

      // Envia o arquivo descompactado direto para o R2
      const uploadPromise = s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: extractedFileKey,
          Body: fileBuffer,
          ContentType: contentType,
        })
      )
      uploadPromises.push(uploadPromise)
    }

    // Aguarda todos os uploads terminarem
    await Promise.all(uploadPromises)

    // 3. Atualiza o banco de dados criando o ScormPackage
    const storagePath = `courses/${courseId}/extracted` // Caminho sob o domínio mapeado

    await prisma.scormPackage.upsert({
      where: { courseId },
      update: {
        scormVersion: '1.2',
        entryPoint,
        storagePath: extractPathPrefix, // Mapeia o diretório raiz dos arquivos no R2
      },
      create: {
        courseId,
        scormVersion: '1.2',
        entryPoint,
        storagePath: extractPathPrefix,
      }
    })

    // 4. Limpa o arquivo .zip temporário do R2 para economizar espaço
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: bucketKey
        })
      )
    } catch (delError) {
      console.warn('Falha ao deletar o zip temporário do R2 (não impede a conclusão):', delError)
    }

    return NextResponse.json({
      success: true,
      entryPoint,
      storagePath: extractPathPrefix
    })

  } catch (error: any) {
    console.error('Erro ao descompactar pacote SCORM:', error)
    return NextResponse.json({ error: error.message || 'Erro ao processar pacote SCORM.' }, { status: 500 })
  }
}
