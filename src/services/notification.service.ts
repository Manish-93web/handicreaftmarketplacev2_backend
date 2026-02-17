import { EmailService } from '../utils/email.service';
import logger from '../utils/logger';
import { Notification } from '../models/notification.model';

export class NotificationService {
    /**
     * Send in-app notification
     */
    static async sendNotification(recipientId: string, type: any, title: string, message: string, data?: any) {
        try {
            await Notification.create({
                recipientId,
                type,
                title,
                message,
                data
            });
            // TODO: Emit socket event for real-time
        } catch (error) {
            logger.error('Failed to send in-app notification:', error);
        }
    }
    /**
     * Send email notification (wraps utility)
     */
    static async sendEmail(to: string, subject: string, html: string) {
        return await EmailService.sendEmail(to, subject, html);
    }

    /**
     * Send SMS notification (Mock implementation)
     */
    static async sendSMS(to: string, message: string) {
        // In a real application, integrate with Twilio, AWS SNS, etc.
        logger.info(`[SMS MOCK] To: ${to}, Message: ${message}`);
        // We'll also log to a file for easy verification by the user
        const fs = require('fs');
        const path = require('path');
        const logMsg = `[${new Date().toISOString()}] SMS to ${to}: ${message}\n`;
        fs.appendFileSync(path.join(process.cwd(), 'sms_logs.txt'), logMsg);
        return true;
    }

    /**
     * Send Approval Notification to Seller
     */
    static async sendSellerApproval(email: string, phone: string, name: string, credentials: { email: string; password: string }) {
        const subject = 'Congratulations! Your Seller Account has been Approved';
        const html = `
            <h1>Congratulations ${name}!</h1>
            <p>Your application to join the Handicraft Marketplace has been approved by the Admin.</p>
            <p>Here are your login credentials for the Seller Dashboard:</p>
            <ul>
                <li><strong>Email:</strong> ${credentials.email}</li>
                <li><strong>Password:</strong> ${credentials.password}</li>
            </ul>
            <p>Please login and change your password immediately for security.</p>
            <p>Happy selling!</p>
        `;

        const smsMessage = `Congratulations ${name}! Your seller account on Handicraft Marketplace is approved. Credentials: Email: ${credentials.email}, Pass: ${credentials.password}`;

        await this.sendEmail(email, subject, html);
        if (phone) {
            await this.sendSMS(phone, smsMessage);
        }
    }

    /**
     * Send Rejection Notification to Seller
     */
    static async sendSellerRejection(email: string, phone: string, name: string, reason: string) {
        const subject = 'Update on your Seller Application';
        const html = `
            <h1>Hello ${name},</h1>
            <p>Thank you for your interest in joining the Handicraft Marketplace.</p>
            <p>Unfortunately, your seller application has been reviewed and could not be approved at this time for the following reason:</p>
            <p style="color: red;"><strong>${reason}</strong></p>
            <p>If you have any questions or would like to re-apply after addressing the above, please feel free to contact us.</p>
            <p>Best regards,<br>Handicraft Marketplace Team</p>
        `;

        const smsMessage = `Hello ${name}, your seller application was not approved. Reason: ${reason}. Please check your email for details.`;

        await this.sendEmail(email, subject, html);
        if (phone) {
            await this.sendSMS(phone, smsMessage);
        }
    }

    /**
     * Send Product Approval Notification to Seller
     */
    static async sendProductApproval(email: string, phone: string, sellerName: string, productTitle: string) {
        const subject = 'Product Approved - Now Live on Marketplace!';
        const html = `
            <h1>Congratulations ${sellerName}!</h1>
            <p>Your product "<strong>${productTitle}</strong>" has been reviewed and approved by our admin team.</p>
            <p>It is now live on the Handicraft Marketplace and available for customers to purchase.</p>
            <p>You can view and manage your product from your Seller Dashboard.</p>
            <p>Happy selling!</p>
            <p>Best regards,<br>Handicraft Marketplace Team</p>
        `;

        const smsMessage = `Congratulations ${sellerName}! Your product "${productTitle}" is now live on Handicraft Marketplace.`;

        await this.sendEmail(email, subject, html);
        if (phone) {
            await this.sendSMS(phone, smsMessage);
        }
    }

    /**
     * Send Product Rejection Notification to Seller
     */
    static async sendProductRejection(email: string, phone: string, sellerName: string, productTitle: string) {
        const subject = 'Product Review Update';
        const html = `
            <h1>Hello ${sellerName},</h1>
            <p>Thank you for submitting your product "<strong>${productTitle}</strong>" to the Handicraft Marketplace.</p>
            <p>After careful review, we regret to inform you that this product could not be approved at this time.</p>
            <p>This may be due to:</p>
            <ul>
                <li>Incomplete product information</li>
                <li>Quality standards not met</li>
                <li>Policy violations</li>
            </ul>
            <p>You can edit and resubmit your product from the Seller Dashboard. If you have questions, please contact our support team.</p>
            <p>Best regards,<br>Handicraft Marketplace Team</p>
        `;

        const smsMessage = `Hello ${sellerName}, your product "${productTitle}" requires changes. Please check your email for details.`;

        await this.sendEmail(email, subject, html);
        if (phone) {
            await this.sendSMS(phone, smsMessage);
        }
    }
}
