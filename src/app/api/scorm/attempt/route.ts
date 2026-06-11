import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Busca a tentativa ativa ou cria uma nova tentativa de curso para o Aluno
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação: Usuário logado
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { enrollmentId } = body

    if (!enrollmentId) {
      return NextResponse.json({ error: 'O ID da matrícula (enrollmentId) é obrigatório.' }, { status: 400 })
    }

    // Busca a matrícula e valida se pertence ao usuário logado
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            scormPackage: true
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Matrícula não encontrada.' }, { status: 404 })
    }

    // Segurança: Apenas o próprio aluno dono da matrícula pode iniciar a tentativa
    if (enrollment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acesso não autorizado a esta matrícula.' }, { status: 403 })
    }

    const scormPackage = enrollment.course.scormPackage

    if (!scormPackage) {
      return NextResponse.json({ error: 'Este curso não possui um pacote SCORM válido configurado.' }, { status: 400 })
    }

    // Verifica se já existe uma tentativa em andamento (status 'incomplete')
    let activeAttempt = await prisma.scormAttempt.findFirst({
      where: {
        enrollmentId,
        status: 'incomplete'
      },
      orderBy: { attemptNumber: 'desc' }
    })

    // Se não houver tentativa ativa, cria uma nova
    if (!activeAttempt) {
      // Descobre o número da última tentativa para incrementar
      const lastAttempt = await prisma.scormAttempt.findFirst({
        where: { enrollmentId },
        orderBy: { attemptNumber: 'desc' }
      })

      const nextAttemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1

      activeAttempt = await prisma.scormAttempt.create({
        data: {
          tenantId: enrollment.tenantId,
          enrollmentId,
          attemptNumber: nextAttemptNumber,
          status: 'incomplete',
          scoreRaw: 0.0,
          lessonLocation: '',
        }
      })
    }

    // Retorna a tentativa ativa junto com os caminhos de carregamento do curso
    return NextResponse.json({
      success: true,
      attempt: activeAttempt,
      scormPackage: {
        entryPoint: scormPackage.entryPoint,
        storagePath: scormPackage.storagePath,
        // URL completa do player no iframe (passando pelo Next.js rewrite)
        launchUrl: `/courses/${scormPackage.storagePath}${scormPackage.entryPoint}`
      }
    })

  } catch (error) {
    console.error('Erro ao iniciar tentativa SCORM:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
