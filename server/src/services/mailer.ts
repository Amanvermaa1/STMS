import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface Mailer {
  readonly configured: boolean;
  send(message: { to: string[]; subject: string; text: string }): Promise<void>;
}

export function createNoopMailer(): Mailer {
  return {
    configured: false,
    async send() {},
  };
}

export function createMailer(): Mailer {
  if (!env.smtpHost) return createNoopMailer();

  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
  });

  return {
    configured: true,
    async send({ to, subject, text }) {
      if (to.length === 0) return;
      try {
        await transport.sendMail({ from: env.smtpFrom, to: to.join(', '), subject, text });
      } catch (error) {
        // Email is a bonus feature: never let SMTP failures break ticket operations.
        console.error('Email notification failed:', error);
      }
    },
  };
}
