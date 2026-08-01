import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { logger } from "../utils/monitoring";

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private usesSendGrid: boolean = false;

  constructor() {
    this.initializeEmailService();
  }

  private initializeEmailService() {
    const emailService = process.env.EMAIL_SERVICE;

    if (emailService === "sendgrid" && process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.usesSendGrid = true;
      logger.info("Email service initialized with SendGrid");
    } else if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info("Email service initialized with SMTP");
    } else {
      logger.warn("No email service configured");
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    email: string,
    username: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
    
    const template = this.getEmailVerificationTemplate(username, verificationUrl);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Email verification sent", { email, username });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    username: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    
    const template = this.getPasswordResetTemplate(username, resetUrl);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Password reset email sent", { email, username });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, username: string): Promise<void> {
    const template = this.getWelcomeTemplate(username);
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Welcome email sent", { email, username });
  }

  /**
   * Send subscription confirmation
   */
  async sendSubscriptionConfirmation(
    email: string,
    username: string,
    planName: string,
    amount: number
  ): Promise<void> {
    const template = this.getSubscriptionConfirmationTemplate(
      username,
      planName,
      amount
    );
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Subscription confirmation sent", { email, username, planName });
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    username: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    const template = this.getNotificationTemplate(
      username,
      title,
      message,
      actionUrl
    );
    
    await this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    logger.info("Notification email sent", { email, username, title });
  }

  /**
   * Core email sending method
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      const emailData = {
        from: {
          email: process.env.EMAIL_FROM!,
          name: process.env.EMAIL_FROM_NAME || "SmartNotes",
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (this.usesSendGrid) {
        await sgMail.send(emailData);
      } else if (this.transporter) {
        await this.transporter.sendMail({
          from: `${emailData.from.name} <${emailData.from.email}>`,
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } else {
        throw new Error("No email service configured");
      }

      logger.info("Email sent successfully", {
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error("Failed to send email", {
        error,
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  /**
   * Email verification template
   */
  private getEmailVerificationTemplate(
    username: string,
    verificationUrl: string
  ): EmailTemplate {
    return {
      subject: "Verify your SmartNotes account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SmartNotes!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${username},</h2>
            
            <p>Thank you for joining SmartNotes! To complete your registration and start your learning journey, please verify your email address.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">This verification link will expire in 24 hours. If you didn't create an account with SmartNotes, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© 2024 SmartNotes. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to SmartNotes!
        
        Hi ${username},
        
        Thank you for joining SmartNotes! To complete your registration, please verify your email address by clicking the link below:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours. If you didn't create an account with SmartNotes, please ignore this email.
        
        © 2024 SmartNotes. All rights reserved.
      `,
    };
  }

  /**
   * Password reset template
   */
  private getPasswordResetTemplate(
    username: string,
    resetUrl: string
  ): EmailTemplate {
    return {
      subject: "Reset your SmartNotes password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${username},</h2>
            
            <p>We received a request to reset your SmartNotes password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">This reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© 2024 SmartNotes. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset - SmartNotes
        
        Hi ${username},
        
        We received a request to reset your SmartNotes password. Click the link below to create a new password:
        
        ${resetUrl}
        
        This reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        
        © 2024 SmartNotes. All rights reserved.
      `,
    };
  }

  /**
   * Welcome email template
   */
  private getWelcomeTemplate(username: string): EmailTemplate {
    return {
      subject: "Welcome to SmartNotes - Let's start learning!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to SmartNotes</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to SmartNotes!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${username},</h2>
            
            <p>Your email has been verified and your SmartNotes account is now active! You're ready to transform your learning experience with our AI-powered platform.</p>
            
            <h3 style="color: #667eea;">🚀 Get Started:</h3>
            <ul style="padding-left: 20px;">
              <li>Create your first note with our enhanced editor</li>
              <li>Try the AI learning assistant for personalized help</li>
              <li>Start a focused study session with Pomodoro timer</li>
              <li>Generate flashcards from your notes</li>
              <li>Join study groups for collaborative learning</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
            </div>
            
            <p>Need help getting started? Check out our <a href="${process.env.CLIENT_URL}/help" style="color: #667eea;">help center</a> or reply to this email.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© 2024 SmartNotes. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to SmartNotes!
        
        Hi ${username},
        
        Your email has been verified and your SmartNotes account is now active! You're ready to transform your learning experience.
        
        Get Started:
        - Create your first note with our enhanced editor
        - Try the AI learning assistant for personalized help
        - Start a focused study session with Pomodoro timer
        - Generate flashcards from your notes
        - Join study groups for collaborative learning
        
        Visit your dashboard: ${process.env.CLIENT_URL}/dashboard
        
        Need help? Check out our help center or reply to this email.
        
        © 2024 SmartNotes. All rights reserved.
      `,
    };
  }

  /**
   * Subscription confirmation template
   */
  private getSubscriptionConfirmationTemplate(
    username: string,
    planName: string,
    amount: number
  ): EmailTemplate {
    return {
      subject: `Welcome to SmartNotes ${planName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Subscription Confirmed!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${username},</h2>
            
            <p>Thank you for upgrading to <strong>SmartNotes ${planName}</strong>! Your subscription is now active.</p>
            
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #10b981;">Subscription Details:</h3>
              <p><strong>Plan:</strong> ${planName}</p>
              <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}/month</p>
              <p><strong>Status:</strong> Active</p>
            </div>
            
            <p>You now have access to all premium features. Start exploring your enhanced learning experience!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/dashboard" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Access Premium Features</a>
            </div>
            
            <p>Questions about your subscription? Visit your <a href="${process.env.CLIENT_URL}/account/billing" style="color: #10b981;">billing settings</a> or contact support.</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© 2024 SmartNotes. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Subscription Confirmed - SmartNotes
        
        Hi ${username},
        
        Thank you for upgrading to SmartNotes ${planName}! Your subscription is now active.
        
        Subscription Details:
        - Plan: ${planName}
        - Amount: $${(amount / 100).toFixed(2)}/month
        - Status: Active
        
        You now have access to all premium features. Start exploring your enhanced learning experience!
        
        Visit your dashboard: ${process.env.CLIENT_URL}/dashboard
        
        Questions? Visit your billing settings or contact support.
        
        © 2024 SmartNotes. All rights reserved.
      `,
    };
  }

  /**
   * Notification email template
   */
  private getNotificationTemplate(
    username: string,
    title: string,
    message: string,
    actionUrl?: string
  ): EmailTemplate {
    return {
      subject: `SmartNotes: ${title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${username},</h2>
            
            <p>${message}</p>
            
            ${actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${actionUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Take Action</a>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>© 2024 SmartNotes. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        ${title} - SmartNotes
        
        Hi ${username},
        
        ${message}
        
        ${actionUrl ? `Take action: ${actionUrl}` : ''}
        
        © 2024 SmartNotes. All rights reserved.
      `,
    };
  }
}
