import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lista todos os colaboradores (alunos) da empresa do gestor logado
 *     tags:
 *       - Admin Usuários
 *     parameters:
 *       - in: query
 *         name: tenantId
 *         schema:
 *           type: string
 *         required: false
 *         description: ID da empresa/tenant (obrigatório se for Superadmin, opcional se for RH)
 *     responses:
 *       200:
 *         description: Lista de colaboradores retornada com sucesso.
 *       400:
 *         description: ID da empresa é obrigatório.
 *       403:
 *         description: Não autorizado (apenas RH ou Superadmin).
 *       500:
 *         description: Erro interno do servidor.
 */
// GET: Lista todos os colaboradores (alunos) da empresa do gestor logado
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação de segurança: apenas gestores de RH ou Superadmin podem acessar
  if (!session || (session.user.role !== 'RH' && session.user.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  // Se for RH, filtra obrigatoriamente pelos usuários do tenant dele
  // Se for Superadmin, pode filtrar via query param ?tenantId=...
  const { searchParams } = new URL(request.url)
  const tenantId = session.user.role === 'RH' 
    ? session.user.tenantId 
    : searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'O ID da empresa é obrigatório.' }, { status: 400 })
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        role: 'USER' // Filtra apenas colaboradores, ignora outros admins do RH
      },
      include: {
        enrollments: {
          include: {
            course: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Erro ao listar colaboradores:', error)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Cadastra um novo colaborador (aluno) e opcionalmente o matricula em um curso
 *     tags:
 *       - Admin Usuários
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do colaborador
 *               email:
 *                 type: string
 *                 description: E-mail do colaborador (deve ser único globalmente)
 *               courseId:
 *                 type: string
 *                 description: ID de um curso opcional para matricular o colaborador no momento do cadastro
 *               tenantId:
 *                 type: string
 *                 description: ID da empresa/tenant (necessário se logado como Superadmin)
 *     responses:
 *       201:
 *         description: Colaborador cadastrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     tempPassword:
 *                       type: string
 *                       description: Senha provisória gerada automaticamente
 *                 enrollment:
 *                   type: object
 *                   nullable: true
 *                   description: Dados da matrícula se courseId foi enviado
 *                 emailSent:
 *                   type: boolean
 *                   description: Indica se o e-mail de onboarding via Resend foi enviado com sucesso
 *       400:
 *         description: Parâmetro obrigatório ausente, e-mail duplicado, ou erro de permissão do curso.
 *       403:
 *         description: Não autorizado.
 *       500:
 *         description: Erro interno do servidor.
 */
// POST: Cadastra um novo colaborador e opcionalmente o matricula em um curso
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Validação de segurança: apenas RH ou Superadmin
  if (!session || (session.user.role !== 'RH' && session.user.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, courseId } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e E-mail são obrigatórios.' }, { status: 400 })
    }

    // Determina o tenantId. Se for gestor do RH, usa o tenant dele.
    // Se for Superadmin, o tenantId deve ser enviado no JSON.
    const tenantId = session.user.role === 'RH' 
      ? session.user.tenantId 
      : body.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'ID do inquilino (Tenant) não identificado.' }, { status: 400 })
    }

    // Busca as informações do Tenant para montar o link correto
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Empresa cliente não encontrada.' }, { status: 400 })
    }

    // Valida se o e-mail já existe globalmente
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado no sistema.' }, { status: 400 })
    }

    // Gera senha temporária
    const tempPassword = crypto.randomBytes(4).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    // Executa em transação para cadastrar usuário e matricular simultaneamente
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          passwordHash,
          role: 'USER',
          tenantId
        }
      })

      let enrollment = null
      if (courseId) {
        // Valida se o curso pertence a este tenant
        const course = await tx.course.findFirst({
          where: { id: courseId, tenantId }
        })

        if (!course) {
          throw new Error('Curso não encontrado ou não pertence a esta empresa.')
        }

        enrollment = await tx.enrollment.create({
          data: {
            tenantId,
            userId: newUser.id,
            courseId,
            status: 'NOT_STARTED'
          }
        })
      }

      return { newUser, enrollment }
    })

    const loginUrl = `http://${tenant.slug}.localhost:3000/login`

    // Envio do e-mail com Resend
    let emailSent = false
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Treinamentos LMS <suporte@plataforma.com>',
          to: email,
          subject: `Acesso liberado aos treinamentos da ${tenant.name}!`,
          html: `
            <h1>Boas-vindas à plataforma de treinamentos!</h1>
            <p>Olá, <strong>${name}</strong>.</p>
            <p>Seu gestor de RH criou seu acesso na plataforma para iniciar seus cursos.</p>
            <p>Seus dados de acesso:</p>
            <ul>
              <li><strong>Link de Acesso:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
              <li><strong>Login (E-mail):</strong> ${email}</li>
              <li><strong>Senha Provisória:</strong> ${tempPassword}</li>
            </ul>
            <p>Por favor, altere sua senha no primeiro login para garantir a segurança dos seus dados.</p>
          `
        })
        emailSent = true
      } catch (err) {
        console.error('Falha no envio de e-mail ao aluno pelo Resend:', err)
      }
    }

    // Log de segurança/desenvolvimento
    console.log('\n==================================================')
    console.log(`👤 NOVO ALUNO CADASTRADO: ${name} (${email})`)
    console.log(`🏢 EMPRESA: ${tenant.name}`)
    console.log(`🔑 SENHA PROVISÓRIA: ${tempPassword}`)
    console.log(`🔗 LINK DE ACESSO: ${loginUrl}`)
    if (courseId) console.log(`📚 MATRICULADO NO CURSO ID: ${courseId}`)
    console.log('==================================================\n')

    return NextResponse.json({
      success: true,
      user: {
        id: result.newUser.id,
        name: result.newUser.name,
        email: result.newUser.email,
        tempPassword
      },
      enrollment: result.enrollment,
      emailSent
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erro ao cadastrar colaborador:', error)
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 })
  }
}
