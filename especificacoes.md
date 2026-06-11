# Especificações Técnicas - Plataforma LMS SCORM Multi-Tenant

Este documento serve como o Guia de Especificação e Referência para o desenvolvimento da plataforma LMS SCORM. Ele reúne todos os requisitos arquiteturais, modelo de dados, comportamento dos portais e integrações com o SCORM.

---

## 1. Arquitetura Geral

A plataforma será construída como um monorepo usando o framework **Next.js** (tanto Frontend quanto APIs backend) e hospedada na **Vercel** (plano gratuito) para o MVP.

### Componentes de Infraestrutura (Free Tier MVP):
*   **Aplicações & APIs:** Next.js hospedado na **Vercel**.
*   **Banco de Dados:** **PostgreSQL** hospedado no **Supabase** (limite de 500MB).
*   **Armazenamento de Cursos (SCORM):** **Cloudflare R2** (limite de 10GB com tráfego/egress gratuito).

### Resolução da Same-Origin Policy (SOP):
Para que o curso rodando no `<iframe>` consiga enviar dados de progresso para a plataforma via JavaScript (`window.API`), ambos devem estar sob o mesmo domínio. 
Será utilizada a regra de **Rewrite** do Next.js no `next.config.js`:
```javascript
// Exemplo no next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/courses/:path*',
        destination: 'https://seu-bucket-r2.cloudflare.com/courses/:path*',
      },
    ]
  },
}
```

---

## 2. Multi-Tenancy (Multi-inquilino)

A plataforma será vendida para empresas B2B. Adotaremos o modelo **Shared Database / Shared Schema** (Banco compartilhado com coluna discriminadora `tenantId`).

### Estrutura de Domínios:
1.  **Landing Page:** `www.plataformascorm.com` (apresentação do produto).
2.  **Acesso de Clientes (Subdomínios):** `empresa-a.plataformascorm.com` ou `empresa-b.plataformascorm.com`.
3.  O **Next.js Middleware** interceptará o host, identificará o subdomínio e carregará o banco de dados e as cores de marca daquela empresa específica.

---

## 3. Estrutura de Banco de Dados (Prisma ORM)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Tenant {
  id           String        @id @default(uuid())
  name         String
  slug         String        @unique // ex: "acme"
  logoUrl      String?
  primaryColor String        @default("#3b82f6")
  createdAt    DateTime      @default(now())

  users        User[]
  courses      Course[]
  enrollments  Enrollment[]
}

model User {
  id           String        @id @default(uuid())
  tenantId     String?       // Opcional: nulo para Superadmin
  tenant       Tenant?       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name         String
  email        String        @unique // Único globalmente para facilitar o login no MVP
  passwordHash String
  role         Role          @default(USER) // SUPERADMIN, RH, USER
  createdAt    DateTime      @default(now())
  
  enrollments  Enrollment[]

  @@index([tenantId])
}

enum Role {
  SUPERADMIN
  RH
  USER
}

model Course {
  id           String        @id @default(uuid())
  tenantId     String
  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  createdAt    DateTime      @default(now())

  scormPackage ScormPackage?
  enrollments  Enrollment[]
}

model ScormPackage {
  id           String        @id @default(uuid())
  courseId     String        @unique
  course       Course        @relation(fields: [courseId], references: [id], onDelete: Cascade)
  scormVersion String        @default("1.2")
  entryPoint   String        @default("index.html")
  storagePath  String        // Caminho no R2
}

model Enrollment {
  id           String        @id @default(uuid())
  tenantId     String
  tenant       Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId     String
  course       Course        @relation(fields: [courseId], references: [id], onDelete: Cascade)
  status       String        @default("NOT_STARTED") // NOT_STARTED, IN_PROGRESS, COMPLETED
  enrolledAt   DateTime      @default(now())

  attempts     ScormAttempt[]

  @@unique([userId, courseId])
}

model ScormAttempt {
  id             String         @id @default(uuid())
  tenantId       String
  enrollmentId   String
  enrollment     Enrollment     @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  attemptNumber  Int            @default(1)
  status         String         @default("incomplete") // incomplete, completed, passed, failed
  scoreRaw       Float          @default(0.0)
  lessonLocation String         @default("")
  lastAccessed   DateTime       @default(now())

  trackingData   ScormTracking[]
}

model ScormTracking {
  id             String         @id @default(uuid())
  tenantId       String
  attemptId      String
  attempt        ScormAttempt   @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  cmiKey         String
  cmiValue       String         @db.Text
  updatedAt      DateTime       @default(now()) @updatedAt

  @@unique([attemptId, cmiKey])
  @@index([tenantId])           // Adicionado: queries por tenant sem full scan
}
```

> ⚠️ **Índices recomendados:** O `@@unique([attemptId, cmiKey])` em `ScormTracking` cria índice único, mas queries de leitura por `enrollmentId` fazem joins pesados atravessando `ScormAttempt`. Adicionar `@@index([tenantId])` nos modelos `ScormAttempt` e `ScormTracking` evita full scans conforme o volume de dados cresce.

> ⚠️ **SCORM 2004 fora do escopo do MVP:** O schema registra `scormVersion` mas a API injetada (`window.API`) é exclusiva do **SCORM 1.2**. SCORM 2004 utiliza `window.API_1484_11` com interface diferente. Suporte a SCORM 2004 **não será implementado no MVP** — pacotes nesse formato não funcionarão corretamente. Documentar isso na interface de upload para o RH.
```

---

## 4. Funcionalidades do Portal do Aluno (Colaborador)

*   **Telas:**
    *   `/dashboard`: Lista de cursos ativos divididos por status (Não Iniciado, Em Progresso, Concluído). Barra de progresso visual.
    *   `/player/[enrollmentId]`: Layout imersivo (100% de largura) contendo o Iframe que renderiza o curso SCORM.
*   **Comunicação SCORM 1.2:**
    *   Injeção do script global no escopo da página pai:
        ```javascript
        window.API = {
          LMSInitialize: (param) => { ... },
          LMSGetValue: (element) => { ... },
          LMSSetValue: (element, value) => { ... },
          LMSCommit: (param) => { ... },
          LMSFinish: (param) => { ... }
        }
        ```
    *   Sincronização assíncrona com `/api/scorm/track` ao disparar o `LMSCommit`.
---

### 5. Funcionalidades do Portal do RH (Administrador do Cliente)

*   **Telas:**
    *   `/admin`: Dashboard executivo com relatórios gráficos de engajamento da equipe.
    *   `/admin/users`: Cadastro individual ou importação em lote (CSV) de alunos.
    *   `/admin/courses`: Criação de cursos e upload de pacotes SCORM (.zip).
*   **Upload e Processamento SCORM:**
    1.  O RH arrasta o `.zip` do curso.
    2.  O backend processa o arquivo, lê o `imsmanifest.xml` para encontrar o ponto de entrada (`entryPoint`) e o título.
    3.  Os arquivos do curso são descompactados e enviados ao Cloudflare R2.

> ⚠️ **Restrição Vercel Free Tier:** Funções Serverless têm limite de **4.5MB de payload** e **timeout de 10s**. Pacotes SCORM reais variam de 50–200MB, tornando inviável o upload passando pelo backend. A estratégia correta é **Presigned URL**: o backend gera uma URL temporária de escrita diretamente no R2, e o browser do cliente faz o upload direto para o bucket, sem trafegar pelo servidor Next.js.
*   **Relatórios:**
    *   Histórico individual de notas e tempo de estudo.
    *   Exportação de dados consolidados em planilha CSV.

---

## 6. Middleware de Multi-Tenancy (Detecção de Subdomínio)

O middleware é o ponto de entrada de toda request na plataforma. Ele identifica qual tenant está sendo acessado a partir do subdomínio e injeta essa informação como header para as páginas consumirem.

### Arquivo: `middleware.ts` (raiz do projeto)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const slug = extractSlug(host, new URL(request.url))

  if (!slug) {
    // É a landing page (www ou raiz) — deixa passar normalmente
    return NextResponse.next()
  }

  // Injeta o slug como header para Server Components lerem via headers()
  const response = NextResponse.next()
  response.headers.set('x-tenant-slug', slug)
  return response
}

function extractSlug(host: string, url: URL): string | null {
  // Fallback para desenvolvimento local via query param
  // Acesso: localhost:3000/dashboard?tenant=empresa-a
  if (process.env.NODE_ENV === 'development') {
    const tenantParam = url.searchParams.get('tenant')
    if (tenantParam) return tenantParam
  }

  // Remove porta: "empresa-a.localhost:3000" → "empresa-a.localhost"
  const hostWithoutPort = host.split(':')[0]
  const parts = hostWithoutPort.split('.')

  // "localhost" ou "plataformascorm.com" sem subdomínio → landing page
  if (parts.length < 2) return null
  // "www.plataformascorm.com" → landing page
  if (parts[0] === 'www') return null

  return parts[0] // "empresa-a"
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Como as páginas consomem o slug

```typescript
// Exemplo: app/dashboard/page.tsx
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const slug = headers().get('x-tenant-slug')

  if (!slug) redirect('/')

  const tenant = await prisma.tenant.findUnique({ where: { slug } })

  if (!tenant) notFound()

  // tenant.primaryColor, tenant.logoUrl disponíveis para theming
}
```

### Estratégia para desenvolvimento local

| Abordagem | Como usar | Quando usar |
|---|---|---|
| **Query param** | `localhost:3000/dashboard?tenant=empresa-a` | Fase inicial — sem configuração |
| **`/etc/hosts`** | Adicionar `127.0.0.1 empresa-a.localhost` | Testar fluxo real de subdomínio |

Recomendado: começar com query param e migrar para `/etc/hosts` ao testar o comportamento de produção.

---

## 7. Fluxo de Provisionamento e Onboarding B2B (Resend)

O onboarding de novos clientes e usuários é automatizado através do envio de credenciais provisórias pelo serviço de e-mail **Resend**:

### 1. Criação do Cliente (Fluxo do Superadmin):
*   Você (Superadmin) cadastra um novo cliente informando: Nome da Empresa, Slug do Subdomínio e E-mail do gestor de RH.
*   A API cria o `Tenant` e o usuário `RH` com senha provisória aleatória.
*   O Resend envia um e-mail para o gestor: *"Olá [Nome], sua plataforma LMS para a [Empresa] está pronta. Acesse [subdominio.lms.com/admin] | Login: [email] | Senha: [temporaria]"*.
*   No primeiro login, o RH é redirecionado para definir sua senha permanente e configurar o logotipo e cores de marca da empresa.

### 2. Cadastro de Colaboradores (Fluxo do RH):
*   O RH acessa o painel administrativo e cadastra um funcionário (Nome, E-mail) e o vincula a um curso.
*   O sistema cria o usuário `USER`, gera uma matrícula e uma senha provisória.
*   O Resend dispara um e-mail para o funcionário: *"Olá [Nome], a [Empresa] te matriculou no treinamento [Curso]. Acesse para assistir: [subdominio.lms.com/login] | Login: [email] | Senha: [temporaria]"*.

---

## 8. Próximos Passos (Plano de Trabalho)

1.  **Inicializar o Next.js** no diretório de trabalho.
2.  **Configurar o Prisma** e instanciar o banco PostgreSQL (utilizando o schema com suporte ao Superadmin).
3.  **Configurar a integração com o Resend** para disparar os e-mails de acesso.
4.  **Desenvolver o Middleware e Rotas Dinâmicas** para simular subdomínios localmente (`*.localhost:3000`).
5.  **Criar o protótipo do Player SCORM** injetando a API no iframe.
6.  **Codificar a rota de Upload e Descompactação do SCORM**.
