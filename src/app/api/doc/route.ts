import { NextResponse } from 'next/server'
import { createSwaggerSpec } from 'next-swagger-doc'

export async function GET() {
  const spec = createSwaggerSpec({
    apiFolder: 'src/app/api',
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'LMS SCORM API - Documentação',
        version: '1.0.0',
        description: 'Documentação interativa das rotas da API do LMS SCORM',
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [],
    },
  })

  return NextResponse.json(spec)
}
