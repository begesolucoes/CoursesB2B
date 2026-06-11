import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface TrackingPayload {
  attemptId: string
  cmiData: Record<string, string>
}

/**
 * @swagger
 * /api/scorm/track:
 *   post:
 *     summary: Recebe requisições de persistência (LMSCommit) do Player SCORM e grava no banco
 *     tags:
 *       - SCORM Execução
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - attemptId
 *               - cmiData
 *             properties:
 *               attemptId:
 *                 type: string
 *                 description: ID da tentativa ativa
 *               cmiData:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Objeto chave-valor contendo os dados CMI do SCORM (ex. cmi.core.lesson_status, cmi.core.lesson_location, etc.)
 *     responses:
 *       200:
 *         description: Dados de rastreamento persistidos com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Payload de rastreamento inválido.
 *       401:
 *         description: Não autorizado (não logado).
 *       403:
 *         description: Não autorizado a alterar esta tentativa (não é o dono).
 *       404:
 *         description: Tentativa SCORM não encontrada.
 *       500:
 *         description: Erro interno do servidor.
 */
// POST: Recebe as requisições de LMSCommit() do Player SCORM e persiste no banco
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação: Aluno deve estar autenticado
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const body: TrackingPayload = await request.json()
    const { attemptId, cmiData } = body

    if (!attemptId || !cmiData || typeof cmiData !== 'object') {
      return NextResponse.json({ error: 'Payload de rastreamento inválido.' }, { status: 400 })
    }

    // Busca a tentativa para validar a propriedade e o tenant
    const attempt = await prisma.scormAttempt.findUnique({
      where: { id: attemptId },
      include: {
        enrollment: true
      }
    })

    if (!attempt) {
      return NextResponse.json({ error: 'Tentativa SCORM não encontrada.' }, { status: 404 })
    }

    // Segurança: O aluno logado deve ser o proprietário da tentativa
    if (attempt.enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Não autorizado a alterar este registro.' }, { status: 403 })
    }

    const tenantId = attempt.tenantId

    // Variáveis de resumo para atualizar no ScormAttempt e Enrollment
    let updatedStatus: string | undefined
    let updatedScore: number | undefined
    let updatedLocation: string | undefined

    // Executa as operações de gravação das chaves detalhadas e atualizações de estado
    await prisma.$transaction(async (tx) => {
      // 1. Persiste cada chave-valor do SCORM no banco (ScormTracking)
      for (const [key, value] of Object.entries(cmiData)) {
        await tx.scormTracking.upsert({
          where: {
            attemptId_cmiKey: {
              attemptId,
              cmiKey: key
            }
          },
          update: {
            cmiValue: value
          },
          create: {
            tenantId,
            attemptId,
            cmiKey: key,
            cmiValue: value
          }
        })

        // Captura chaves fundamentais para atualizar o resumo da tentativa
        if (key === 'cmi.core.lesson_status') {
          updatedStatus = value // "completed", "passed", "failed", "incomplete"
        } else if (key === 'cmi.core.score.raw') {
          const parsedScore = parseFloat(value)
          if (!isNaN(parsedScore)) {
            updatedScore = parsedScore
          }
        } else if (key === 'cmi.core.lesson_location') {
          updatedLocation = value
        }
      }

      // 2. Atualiza o resumo no ScormAttempt com base nos dados capturados
      const attemptUpdateData: any = {
        lastAccessed: new Date()
      }
      if (updatedStatus) attemptUpdateData.status = updatedStatus
      if (updatedScore !== undefined) attemptUpdateData.scoreRaw = updatedScore
      if (updatedLocation) attemptUpdateData.lessonLocation = updatedLocation

      await tx.scormAttempt.update({
        where: { id: attemptId },
        data: attemptUpdateData
      })

      // 3. Atualiza o status geral da Matrícula (Enrollment) se o curso for concluído
      if (updatedStatus === 'completed' || updatedStatus === 'passed') {
        await tx.enrollment.update({
          where: { id: attempt.enrollmentId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })
      } else if (attempt.enrollment.status === 'NOT_STARTED') {
        // Se a matrícula estava não iniciada, passa para em progresso
        await tx.enrollment.update({
          where: { id: attempt.enrollmentId },
          data: {
            status: 'IN_PROGRESS'
          }
        })
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao registrar tracking SCORM:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
