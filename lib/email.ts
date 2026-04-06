import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.turbo-smtp.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.TURBO_SMTP_CONSUMER_KEY,
    pass: process.env.TURBO_SMTP_CONSUMER_SECRET,
  },
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  return transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
    replyTo: replyTo || process.env.FROM_EMAIL,
  })
}

// ── Email Templates ──────────────────────────────────────────

export function welcomeTemplate(name: string, workspaceName: string, loginUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:40px 40px 32px;text-align:center">
      <div style="display:inline-block;width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;line-height:48px;font-size:20px;font-weight:800;color:#fff;text-align:center">hs</div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:16px 0 0">Welcome to heySynk</h1>
    </div>
    <div style="padding:40px">
      <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 20px">Hi ${name},</p>
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px">You've been added to <strong>${workspaceName}</strong> on heySynk. You're all set to start handling customer conversations with AI-powered support.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700">Open heySynk →</a>
      </div>
      <p style="font-size:13px;color:#94A3B8;margin:0">If you didn't expect this email, you can safely ignore it.</p>
    </div>
    <div style="border-top:1px solid #F1F5F9;padding:20px 40px;text-align:center">
      <p style="font-size:12px;color:#94A3B8;margin:0">heySynk · AI-powered customer support · <a href="https://heysynk.app" style="color:#2563EB;text-decoration:none">heysynk.app</a></p>
    </div>
  </div>
</body>
</html>`
}

export function passwordResetTemplate(name: string, resetUrl: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:40px;text-align:center">
      <div style="display:inline-block;width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;line-height:48px;font-size:20px;font-weight:800;color:#fff;text-align:center">hs</div>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:16px 0 0">Reset your password</h1>
    </div>
    <div style="padding:40px">
      <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 20px">Hi ${name},</p>
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px">We received a request to reset your heySynk password. Click the button below — this link expires in <strong>1 hour</strong>.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700">Reset Password →</a>
      </div>
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px 16px;margin-top:24px">
        <p style="font-size:13px;color:#991B1B;margin:0">If you didn't request this, please ignore this email. Your password won't change.</p>
      </div>
    </div>
    <div style="border-top:1px solid #F1F5F9;padding:20px 40px;text-align:center">
      <p style="font-size:12px;color:#94A3B8;margin:0">heySynk · <a href="https://heysynk.app" style="color:#2563EB;text-decoration:none">heysynk.app</a></p>
    </div>
  </div>
</body>
</html>`
}

export function csatTemplate(customerName: string, agentName: string, csatUrl: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:40px;text-align:center">
      <div style="font-size:32px">⭐</div>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:12px 0 0">How did we do?</h1>
    </div>
    <div style="padding:40px;text-align:center">
      <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 8px">Hi ${customerName},</p>
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 32px">${agentName} just resolved your support conversation. We'd love to know how we did — it takes 10 seconds.</p>
      <div style="display:flex;justify-content:center;gap:12px;margin:0 0 32px">
        ${[1,2,3,4,5].map(n => `
        <a href="${csatUrl}&score=${n}" style="display:inline-block;width:52px;height:52px;line-height:52px;border-radius:50%;background:#F1F5F9;color:#334155;text-decoration:none;font-size:22px;font-weight:800;text-align:center">${n}</a>`).join('')}
      </div>
      <p style="font-size:13px;color:#94A3B8">1 = Poor · 5 = Excellent</p>
    </div>
    <div style="border-top:1px solid #F1F5F9;padding:20px 40px;text-align:center">
      <p style="font-size:12px;color:#94A3B8;margin:0">heySynk · <a href="https://heysynk.app" style="color:#2563EB;text-decoration:none">heysynk.app</a></p>
    </div>
  </div>
</body>
</html>`
}

export function agentNotificationTemplate(agentName: string, conversationPreview: string, customerName: string, openUrl: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <div style="background:#1E293B;padding:20px 40px;display:flex;align-items:center;gap:12px">
      <div style="width:36px;height:36px;background:linear-gradient(135deg,#2563EB,#7C3AED);border-radius:10px;line-height:36px;font-size:14px;font-weight:800;color:#fff;text-align:center">hs</div>
      <span style="color:#fff;font-weight:700;font-size:15px">heySynk</span>
    </div>
    <div style="padding:40px">
      <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 8px">Hi ${agentName},</p>
      <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 20px">A new conversation has been assigned to you from <strong>${customerName}</strong>:</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #2563EB;border-radius:8px;padding:16px;margin:0 0 28px">
        <p style="font-size:14px;color:#334155;margin:0;line-height:1.7">"${conversationPreview}"</p>
      </div>
      <div style="text-align:center">
        <a href="${openUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700">Open Conversation →</a>
      </div>
    </div>
    <div style="border-top:1px solid #F1F5F9;padding:20px 40px;text-align:center">
      <p style="font-size:12px;color:#94A3B8;margin:0">heySynk · <a href="https://heysynk.app" style="color:#2563EB;text-decoration:none">heysynk.app</a></p>
    </div>
  </div>
</body>
</html>`
}

export function contactFormTemplate(name: string, email: string, message: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
    <div style="background:#1E293B;padding:20px 40px">
      <span style="color:#fff;font-weight:700;font-size:15px">📩 New Contact Form Submission</span>
    </div>
    <div style="padding:40px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;width:80px">Name</td><td style="padding:10px 0;color:#334155;font-size:15px">${name}</td></tr>
        <tr><td style="padding:10px 0;color:#64748B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Email</td><td style="padding:10px 0;color:#334155;font-size:15px"><a href="mailto:${email}" style="color:#2563EB">${email}</a></td></tr>
      </table>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-top:20px">
        <p style="font-size:14px;color:#334155;margin:0;line-height:1.7;white-space:pre-wrap">${message}</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
