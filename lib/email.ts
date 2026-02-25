import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM ?? 'StockPilot <onboarding@stockpilotpro.com>';
const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export async function sendInviteEmail(email: string, token: string, name?: string | null) {
  const inviteUrl = `${appUrl}/invite?token=${token}`;
  
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'You\'ve been invited to StockPilot',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 12px; line-height: 60px; font-size: 24px; font-weight: bold; color: white;">SP</div>
              <h1 style="color: #1f2937; margin: 20px 0 10px;">Welcome to StockPilot</h1>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi${name ? ` ${name}` : ''},</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">You've been invited to join StockPilot, your cabinet shop inventory management system. Click the button below to set up your password and activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Set Up Your Account</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in 7 days. If the button doesn't work, copy and paste this URL into your browser:</p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${inviteUrl}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">StockPilot - Inventory Management for Cabinet Shops</p>
          </div>
        </body>
      </html>
    `
  });

  if (error) {
    console.error('Failed to send invite email:', error);
    throw new Error('Failed to send invite email');
  }

  return data;
}

export async function sendPasswordResetEmail(email: string, token: string, name?: string | null) {
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Reset your StockPilot password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 12px; line-height: 60px; font-size: 24px; font-weight: bold; color: white;">SP</div>
              <h1 style="color: #1f2937; margin: 20px 0 10px;">Reset Your Password</h1>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi${name ? ` ${name}` : ''},</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">StockPilot - Inventory Management for Cabinet Shops</p>
          </div>
        </body>
      </html>
    `
  });

  if (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }

  return data;
}

export async function sendMagicLinkEmail(email: string, token: string, name?: string | null) {
  const magicUrl = `${appUrl}/api/auth/magic-link?token=${token}`;
  
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: 'Your StockPilot login link',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #2563eb, #4f46e5); border-radius: 12px; line-height: 60px; font-size: 24px; font-weight: bold; color: white;">SP</div>
              <h1 style="color: #1f2937; margin: 20px 0 10px;">Sign In to StockPilot</h1>
            </div>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hi${name ? ` ${name}` : ''},</p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Click the button below to sign in to your StockPilot account. No password required!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Sign In to StockPilot</a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">This link will expire in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">StockPilot - Inventory Management for Cabinet Shops</p>
          </div>
        </body>
      </html>
    `
  });

  if (error) {
    console.error('Failed to send magic link email:', error);
    throw new Error('Failed to send magic link email');
  }

  return data;
}
