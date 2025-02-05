import nodemailer from 'nodemailer';
import { modalTypes } from '../models/userModel';
import nodemailerConfig from './nodemailer';

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string | modalTypes;
  subject: string;
  html: string;
}): Promise<void> => {
  const transport: any = nodemailer.createTransport(nodemailerConfig);
  return transport.sendMail({
    from: `Sky Estate <${process.env.NODEMAILER_SENDER}>`,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async ({
  name,
  email,
  verificationToken,
}: {
  name: string;
  email: string | modalTypes;
  verificationToken: number | string;
}): Promise<void> => {
  const verifyEmail = verificationToken;
  const message = `<p>Your verification code is <a href="">${verifyEmail}</a></p>`;

  return sendEmail({
    to: email,
    subject: 'SkyEstate Housing - Verify your email',
    html: `
     <h1>Hello ${name},</h1>
     ${message}
     `,
  });
};

export const sendResetPasswordEmail = async ({
  name,
  email,
  token,
}: {
  name: string;
  email: string | modalTypes;
  token: number;
}): Promise<void> => {
  const message = `<p>Your reset code : <a href="" target="_blank">${token}</a></p>`;

  return sendEmail({
    to: email,
    subject: 'SkyEstate Housing - Reset Password',
    html: `
   <h1>Hello ${name},</h1>
   ${message}`,
  });
};
