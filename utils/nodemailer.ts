const nodemailerConfig: {
  host: string | undefined;
  port: number | undefined;
  secure: boolean;
  auth: {
    user: string | undefined;
    pass: string | undefined;
  };
} = {
  host: process.env.NODEMAILER_HOST || 'default_host',
  port: Number(process.env.NODEMAILER_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.NODEMAILER_AUTH_USER || 'default_user',
    pass: process.env.NODEMAILER_AUTH_PASS || 'default_pass',
  },
};

export default nodemailerConfig;
