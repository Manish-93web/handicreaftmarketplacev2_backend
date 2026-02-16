import nodemailer from 'nodemailer';
import logger from './logger';
import fs from 'fs';
import path from 'path';

// Configure Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass',
    },
});

export class EmailService {
    static async sendEmail(to: string, subject: string, html: string) {
        try {
            // Check if credentials are placeholders
            const isPlaceholder = !process.env.SMTP_USER || process.env.SMTP_USER === 'ethereal_user';

            if (isPlaceholder) {
                this.logEmailToFile(to, subject, html);
                logger.info(`Email logged to file (Placeholder SMTP): ${to}`);
                return { messageId: 'LOGGED_TO_FILE' };
            }

            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Handicraft Marketplace" <no-reply@handicraft.com>',
                to,
                subject,
                html,
            });

            logger.info(`Email sent: ${info.messageId}`);
            if (process.env.SMTP_HOST?.includes('ethereal')) {
                logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
            return info;
        } catch (error) {
            logger.error('Error sending email, falling back to file log:', error);
            this.logEmailToFile(to, subject, html);
            return null;
        }
    }

    private static logEmailToFile(to: string, subject: string, html: string) {
        const logMsg = `
------------------------------------------------------------
[${new Date().toISOString()}] EMAIL TO: ${to}
SUBJECT: ${subject}
CONTENT:
${html}
------------------------------------------------------------
`;
        fs.appendFileSync(path.join(process.cwd(), 'email_logs.txt'), logMsg);
    }
}
