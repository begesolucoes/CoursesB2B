import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * @swagger
 * /api/superadmin/tenants:
 *   get:
 *     summary: Lista todos os tenants (empresas) cadastradas
 *     tags:
 *       - Superadmin Tenants
 *     responses:
 *       200:
 *         description: Lista de empresas cadastrada retornada com sucesso.
 *       403:
 *         description: Não autorizado (apenas SUPERADMIN).
 *       500:
 *         description: Erro interno do servidor.
 */
// GET: Lista todos os tenants (empresas) cadastradas
export async function GET() {
  const session = await getServerSession(authOptions)

  // Validação de segurança: apenas SUPERADMIN pode listar
  if (!session || session.user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, courses: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(tenants)
  } catch (error: any) {
    console.error('Erro ao listar empresas:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor.',
      message: error.message,
      stack: error.stack,
      details: error
    }, { status: 500 })
  }
}

/**
 * @swagger
 * /api/superadmin/tenants:
 *   post:
 *     summary: Cria um novo Tenant (Empresa) e o respectivo usuário gestor de RH
 *     tags:
 *       - Superadmin Tenants
 *     parameters:
 *       - in: header
 *         name: x-superadmin-key
 *         schema:
 *           type: string
 *         required: false
 *         description: Chave secreta de bypass de desenvolvimento (para testar via Postman/API Client sem sessão ativa)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - hrName
 *               - hrEmail
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da empresa cliente
 *               slug:
 *                 type: string
 *                 description: Subdomínio/identificador exclusivo da empresa (será higienizado e transformado em minúsculas)
 *               hrName:
 *                 type: string
 *                 description: Nome completo do gestor de RH
 *               hrEmail:
 *                 type: string
 *                 description: E-mail de login do gestor de RH (deve ser único globalmente)
 *     responses:
 *       201:
 *         description: Empresa e gestor de RH criados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                 hrUser:
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
 *                       description: Senha temporária do gestor
 *                 emailSent:
 *                   type: boolean
 *                   description: Indica se o e-mail de onboarding via Resend foi enviado com sucesso
 *       400:
 *         description: Parâmetro obrigatório ausente, slug ou e-mail já em uso.
 *       403:
 *         description: Não autorizado (exige sessão ativa de SUPERADMIN ou chave de bypass válida).
 *       500:
 *         description: Erro interno do servidor.
 */
// POST: Cria um novo Tenant (Empresa) e o respectivo usuário gestor de RH
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const bypassKey = request.headers.get('x-superadmin-key')
  const devKey = process.env.SUPERADMIN_CREATION_KEY

  const isBypassValid = devKey && bypassKey === devKey
  const isSessionValid = session && session.user.role === 'SUPERADMIN'

  // Validação de segurança: exige sessão de SUPERADMIN ou chave de bypass de desenvolvimento
  if (!isSessionValid && !isBypassValid) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, slug, hrName, hrEmail } = body

    if (!name || !slug || !hrName || !hrEmail) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    const sanitizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')

    // Valida se o slug do tenant já existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: sanitizedSlug }
    })

    if (existingTenant) {
      return NextResponse.json({ error: 'Este subdomínio (slug) já está em uso.' }, { status: 400 })
    }

    // Valida se o e-mail do RH já está cadastrado
    const existingUser = await prisma.user.findUnique({
      where: { email: hrEmail.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Este e-mail de gestor já está em uso no sistema.' }, { status: 400 })
    }

    // Gera uma senha temporária aleatória de 8 caracteres
    const tempPassword = crypto.randomBytes(4).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    // Executa em transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug: sanitizedSlug,
        }
      })

      const hrUser = await tx.user.create({
        data: {
          name: hrName,
          email: hrEmail.toLowerCase().trim(),
          passwordHash,
          role: 'RH',
          tenantId: newTenant.id
        }
      })

      return { newTenant, hrUser }
    })

    // Monta o link de acesso baseado no subdomínio (slug)
    const loginUrl = `http://${sanitizedSlug}.localhost:3000/login`

    // Tenta enviar o e-mail via Resend
    let emailSent = false
    if (resend) {
      try {
        await resend.emails.send({
          from: 'LMS SCORM <onboarding@resend.dev>', // Em produção com domínio verificado, altere aqui
          to: hrEmail,
          subject: 'Seu acesso ao LMS está pronto!',
          html: `
            <h1>Boas-vindas à plataforma!</h1>
            <p>Seu acesso administrativo como gestor de RH foi gerado com sucesso para a empresa <strong>${name}</strong>.</p>
            <p>Para acessar, utilize os dados abaixo:</p>
            <ul>
              <li><strong>Link de Acesso:</strong> <a href="${loginUrl}">${loginUrl}</a></li>
              <li><strong>Login (E-mail):</strong> ${hrEmail}</li>
              <li><strong>Senha Temporária:</strong> ${tempPassword}</li>
            </ul>
            <p>Por segurança, você precisará redefinir esta senha no seu primeiro login.</p>
          `
        })
        emailSent = true
      } catch (err) {
        console.error('Falha no envio de e-mail pelo Resend:', err)
      }
    }

    // Print no console como fallback em desenvolvimento
    console.log('\n==================================================')
    console.log(`🌱 NOVO TENANT CRIADO: ${name} (${sanitizedSlug})`)
    console.log(`👤 GESTOR DE RH: ${hrName} (${hrEmail})`)
    console.log(`🔑 SENHA TEMPORÁRIA: ${tempPassword}`)
    console.log(`🔗 LINK DE ACESSO: ${loginUrl}`)
    console.log('==================================================\n')

    return NextResponse.json({
      success: true,
      tenant: result.newTenant,
      hrUser: {
        id: result.hrUser.id,
        email: result.hrUser.email,
        name: result.hrUser.name,
        tempPassword // Retorna no JSON para o Postman/Superadmin poder copiar manualmente
      },
      emailSent
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erro ao criar empresa:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor.',
      message: error.message,
      stack: error.stack,
      details: error
    }, { status: 500 })
  }
}
