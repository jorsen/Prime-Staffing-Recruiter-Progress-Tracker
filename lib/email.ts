import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = "Prime Staffing <onboarding@resend.dev>"
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

export async function sendWelcomeEmail({
  to,
  firstName,
  password,
}: {
  to: string
  firstName: string
  password: string
}) {
  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Prime Staffing — your account is ready",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:40px 32px;">
          <tr>
            <td>
              <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">Prime Staffing</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#6b7280;">Recruiter Progress Tracker</p>

              <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${firstName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Your account has been created. Use the credentials below to sign in.
              </p>

              <table width="100%" style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Email</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;">${to}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Temporary password</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;font-family:monospace;">${password}</td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
                Please change your password after signing in from the Settings page.
              </p>

              <a href="${APP_URL}/login"
                style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;">
                Sign in to your account
              </a>

              <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;">
                If you weren't expecting this email, you can ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  })
  console.log("[email] sendWelcomeEmail result:", JSON.stringify(result))
}

export async function sendPasswordResetEmail({
  to,
  firstName,
  resetUrl,
}: {
  to: string
  firstName: string
  resetUrl: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your Prime Staffing password",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:40px 32px;">
          <tr>
            <td>
              <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">Prime Staffing</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#6b7280;">Recruiter Progress Tracker</p>

              <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${firstName},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>

              <a href="${resetUrl}"
                style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;margin-bottom:24px;">
                Reset Password
              </a>

              <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  })
}
