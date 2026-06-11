import '../styles/globals.css'
import { Metadata } from 'next'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Plataforma SCORM LMS',
  description: 'Gestão de treinamentos corporativos e cursos SCORM 1.2',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
