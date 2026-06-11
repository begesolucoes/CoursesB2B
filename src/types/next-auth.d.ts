import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    role: string
    tenantId: string | null
    tenantSlug: string | null
  }

  interface Session {
    user: {
      id: string
      role: string
      tenantId: string | null
      tenantSlug: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    tenantId: string | null
    tenantSlug: string | null
  }
}
