import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { s3Client } from '@/lib/r2'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * @swagger
 * /api/admin/courses/presigned-url:
 *   post:
 *     summary: Gera uma URL assinada (Presigned URL) para upload direto para o R2/S3
 *     tags:
 *       - Admin Cursos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - fileName
 *               - fileType
 *             properties:
 *               courseId:
 *                 type: string
 *                 description: ID do curso a ser atualizado
 *               fileName:
 *                 type: string
 *                 description: Nome do arquivo (ex. curso.zip)
 *               fileType:
 *                 type: string
 *                 description: Content-Type do arquivo (ex. application/zip)
 *               tenantId:
 *                 type: string
 *                 description: ID da empresa/tenant (necessário se logado como Superadmin)
 *     responses:
 *       200:
 *         description: URL assinada gerada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadUrl:
 *                   type: string
 *                   description: URL temporária para fazer o upload via PUT
 *                 bucketKey:
 *                   type: string
 *                   description: Chave onde o arquivo será salvo no bucket
 *                 bucketName:
 *                   type: string
 *                   description: Nome do bucket R2/S3
 *       400:
 *         description: Parâmetros obrigatórios ausentes.
 *       403:
 *         description: Não autorizado.
 *       500:
 *         description: Erro ao gerar credenciais de upload.
 */
// POST: Gera uma URL assinada (Presigned URL) para upload direto para o R2/S3
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação: gestores do RH ou Superadmin
  if (!session || (session.user.role !== 'RH' && session.user.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { courseId, fileName, fileType } = body

    if (!courseId || !fileName || !fileType) {
      return NextResponse.json({ error: 'Faltando parâmetros essenciais (courseId, fileName, fileType).' }, { status: 400 })
    }

    const tenantId = session.user.role === 'RH' 
      ? session.user.tenantId 
      : body.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'ID do inquilino (Tenant) não identificado.' }, { status: 400 })
    }

    // O arquivo zip será salvo temporariamente no R2 nesta chave
    const bucketKey = `tenants/${tenantId}/courses/${courseId}/${Date.now()}-${fileName}`

    // Configura o comando de escrita (PUT) no S3/R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || '',
      Key: bucketKey,
      ContentType: fileType,
    })

    // Gera a URL assinada válida por 1 hora (3600 segundos)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return NextResponse.json({
      uploadUrl,
      bucketKey,
      bucketName: process.env.R2_BUCKET_NAME
    })

  } catch (error) {
    console.error('Erro ao gerar Presigned URL:', error)
    return NextResponse.json({ error: 'Erro ao gerar credenciais de upload.' }, { status: 500 })
  }
}
