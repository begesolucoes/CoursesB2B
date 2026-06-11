import { Resend } from 'resend'

// Instancia o cliente do Resend apenas se a API Key estiver configurada
export const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_sua_chave_do_resend'
  ? new Resend(process.env.RESEND_API_KEY)
  : null
