import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * @swagger
 * /api/admin/courses:
 *   get:
 *     summary: Lista todos os cursos cadastrados para a empresa logada
 *     tags:
 *       - Admin Cursos
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         required: false
 *         description: ID da empresa/tenant (obrigatório se for Superadmin, opcional se for RH)
 *     responses:
 *       200:
 *         description: Lista de cursos retornada com sucesso.
 *       400:
 *         description: ID da empresa é obrigatório.
 *       403:
 *         description: Não autorizado (apenas RH ou Superadmin).
 *       500:
 *         description: Erro interno do servidor.
 */
// GET: Lista todos os cursos cadastrados para a empresa logada
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação: gestores do RH ou Superadmin
  if (!session || (session.user.role !== 'RH' && session.user.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const tenantId = session.user.role === 'RH' 
    ? session.user.tenantId 
    : searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'O ID da empresa é obrigatório.' }, { status: 400 })
  }

  try {
    const courses = await prisma.course.findMany({
      where: { tenantId },
      include: {
        scormPackage: true,
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(courses)
  } catch (error) {
    console.error('Erro ao listar cursos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/admin/courses:
 *   post:
 *     summary: Cadastra um novo curso (metadados iniciais)
 *     tags:
 *       - Admin Cursos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Título do curso
 *               description:
 *                 type: string
 *                 description: Descrição do curso
 *               tenantId:
 *                 type: string
 *                 description: ID da empresa/tenant (necessário se logado como Superadmin)
 *     responses:
 *       201:
 *         description: Curso criado com sucesso.
 *       400:
 *         description: Título ou ID da empresa não informado.
 *       403:
 *         description: Não autorizado.
 *       500:
 *         description: Erro interno do servidor.
 */
// POST: Cadastra um novo curso (metadados iniciais)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação: gestores do RH ou Superadmin
  if (!session || (session.user.role !== 'RH' && session.user.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { title, description } = body

    if (!title) {
      return NextResponse.json({ error: 'O título do curso é obrigatório.' }, { status: 400 })
    }

    const tenantId = session.user.role === 'RH' 
      ? session.user.tenantId 
      : body.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'ID do inquilino (Tenant) não identificado.' }, { status: 400 })
    }

    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        tenantId
      }
    })

    return NextResponse.json(newCourse, { status: 201 })
  } catch (error) {
    console.error('Erro ao cadastrar curso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
