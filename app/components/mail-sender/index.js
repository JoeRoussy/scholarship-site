import nodemailer from 'nodemailer';
import config from '../../config';

export const getMailMessage = ({
    name,
    message,
    email
}) => `
    Message from ${name} (${email}):

    ${message}
`;

export const sendMessage = async ({
    to,
    message
}) => {
    const {
        server: {
            smtpPort,
            smtpHost,
            username,
            password,
            tlsCipher
        } = {},
        addresses: {
            noReply
        } = {},
        messages: {
            contact: {
                subject
            } = {}
        } = {}
    } = config.email;

    if (!smtpPort || !smtpHost || !noReply || !username || !password || !subject) {
        throw new Error('Could not find config elements for emailing');
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: {
            user: username,
            pass: password
        },
        requireTLS: true,
        tls: {
            ciphers: tlsCipher
        }
    });

    return transporter.sendMail({
        from: noReply,
        to,
        subject,
        text: message
    });
};