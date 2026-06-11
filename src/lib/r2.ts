import { S3Client } from '@aws-sdk/client-s3'

// Instancia o S3Client configurável (compatível com Cloudflare R2 ou AWS S3)
export const s3Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT || undefined, // Ex: https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})
