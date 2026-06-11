import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const host = request.headers.get('host') || ''

  // Ignora arquivos estáticos, assets, rotas internas do Next e autenticação básica
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Extrai o slug do host (ex: empresa-a.localhost:3000 -> empresa-a)
  const slug = extractSlug(host, url)

  if (!slug) {
    // É a landing page principal (plataforma.com) — deixa passar normalmente
    return NextResponse.next()
  }

  // Se for uma requisição para a rota de superadmin global, deixa passar sem reescrever
  if (url.pathname.startsWith('/superadmin')) {
    return NextResponse.next()
  }

  // Reescreve a rota internamente para a pasta do tenant
  // Ex: request /dashboard de empresa-a -> reescreve para /tenants/empresa-a/dashboard
  const newUrl = new URL(request.url)
  newUrl.pathname = `/tenants/${slug}${url.pathname}`
  
  const response = NextResponse.rewrite(newUrl)
  
  // Injeta o slug do tenant no header para que Server Components leiam se necessário
  response.headers.set('x-tenant-slug', slug)
  
  return response
}

function extractSlug(host: string, url: URL): string | null {
  // Em desenvolvimento, aceita um query param ?tenant=empresa-a
  if (process.env.NODE_ENV === 'development') {
    const tenantParam = url.searchParams.get('tenant')
    if (tenantParam) return tenantParam
  }

  // Remove a porta do host, caso exista (ex: localhost:3000 -> localhost)
  const hostWithoutPort = host.split(':')[0]

  // 1. LISTA DE DOMÍNIOS PRINCIPAIS (Que NÃO devem ser tratados como tenants)
  const mainDomains = [
    'localhost',
    'courses-b2-b.vercel.app',  // <-- Seu domínio da Vercel
    'seu-dominio-principal.com'  // <-- Seu domínio final de produção (quando tiver)
  ]

  // Se o host atual for um domínio principal, não extrai slug (mostra a landing page)
  if (mainDomains.includes(hostWithoutPort)) {
    return null
  }

  const parts = hostWithoutPort.split('.')

  // Se for apenas localhost ou domínio principal sem subdomínio -> sem tenant
  if (parts.length < 2) return null
  
  // Ignora o prefixo www.
  if (parts[0] === 'www') return null

  // Retorna a primeira parte como o slug do tenant (ex: empresa-a.lms.com -> empresa-a)
  return parts[0]
}

export const config = {
  // Executa o middleware em todas as rotas exceto estáticos
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
