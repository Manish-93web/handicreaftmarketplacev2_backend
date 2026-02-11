import nodemailer from 'nodemailer';
import logger from './logger'; // Assuming a logger exists, otherwise console

// Configure Transporter
// For Production: Use environment variables for SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// For Development: pulling values from env or falling back to Ethereal if missing
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass',
    },
});

export class EmailService {
    static async sendEmail(to: string, subject: string, html: string) {
        try {
            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Handicraft Marketplace" <no-reply@handicraft.com>',
                to,
                subject,
                html,
            });

            logger.info(`Email sent: ${info.messageId}`);
            // If using Ethereal, log the preview URL
            if (process.env.SMTP_HOST?.includes('ethereal')) {
                logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            }
            return info;
        } catch (error) {
            logger.error('Error sending email:', error);
            // Don't throw error to prevent breaking main flow, just log it
            return null;
        }
    }
}
