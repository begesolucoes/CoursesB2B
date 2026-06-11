import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@plataforma.com'
  const name = 'Super Admin'
  
  // Hash da senha inicial do Superadmin
  const passwordHash = await bcrypt.hash('admin123', 10)

  console.log('🌱 Iniciando seeding do banco de dados...')

  // Upsert para evitar duplicar registros ao rodar o seed múltiplas vezes
  const superadmin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      passwordHash,
      role: 'SUPERADMIN',
    },
  })

  console.log(`✅ Superadmin criado com sucesso!`)
  console.log(`   E-mail: ${superadmin.email}`)
  console.log(`   Senha padrão: admin123`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
