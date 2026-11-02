import nodemailer from 'nodemailer'
import type { EmailProvider } from '../../modules/auth/auth.types.js'

/** SMTP 投递不进入业务事务；强制 TLS、有限超时且不记录邮件或认证信息。 */
export function createSmtpEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  const host = env['SMTP_HOST']
  const from = env['SMTP_FROM']
  if (!host || !from) throw new Error('SMTP_HOST and SMTP_FROM are required')
  const port = Number(env['SMTP_PORT'] ?? 465)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP_PORT')
  const user = env['SMTP_USER']
  const pass = env['SMTP_PASSWORD']
  if (Boolean(user) !== Boolean(pass)) throw new Error('SMTP credentials must be configured together')
  const transport = nodemailer.createTransport({
    host, port, secure: port === 465, requireTLS: true,
    ...(user && pass ? { auth: { user, pass } } : {}),
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  })
  return {
    async sendChallenge(message) {
      await transport.sendMail({
        from, to: message.email, subject: '篮球裁判工具平台邮箱验证码',
        text: `您的验证码是 ${message.code}，有效期至 ${message.expiresAt.toISOString()}。请勿向他人透露；如非本人操作请忽略。`,
      })
    },
  }
}
