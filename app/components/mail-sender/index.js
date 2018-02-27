import nodemailer from 'nodemailer';
//import handlebars from 'ex[ress-handlebars';
import nodemailerHandlebars from 'nodemailer-express-handlebars';
import config from '../../config';

// Local consts
const TEMPLATE_PATH = 'app/components/mail-sender/templates';
const TEMPLATE_LAYOUT_PATH = 'app/components/mail-sender/templates/layouts';
const TEMPLATE_EXTENSION = '.hbs';
const DEFAULT_LAYOUT = 'main';
const TEMPLATE_PARTIALS = 'app/components/mail-sender/templates/partials';

const defaultContext = {
    rootUrl: 'http://165.227.40.182:3000'
};

export const getContactMailMessage = ({
    name,
    message,
    email
}) => `
    Message from ${name} (${email}):

    ${message}
`;

export const getApplicationMailMessage = ({
    name,
    email,
    application
}) => `Scholarship application from ${name} (${email}):\n\n${application}`;

export const getSignUpMailMessage = ({
    user
}) => {
    // We need to render the template based on the user passed in
    const {
        name,
        isMember
    } = user;

    return {
        context: {
            name,
            isMember
        },
        template: 'signUp'
    };
};

// This function can take a plaintext message or a message containing an hbs template
// and a context to render that in
export const sendMessage = async ({
    to,
    message,
    subject
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
            contact,
            scholarshipApplication
        } = {}
    } = config.email;

    if (!smtpPort || !smtpHost || !noReply || !username || !password || !subject) {
        throw new Error('Could not find config elements for emailing');
    }

    const {
        template,
        context
    } = message;

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

    if (template && context) {
        // We need to render the email
        transporter.use('compile', nodemailerHandlebars({
            viewEngine: {
                extname: TEMPLATE_EXTENSION,
                layoutsDir: TEMPLATE_LAYOUT_PATH,
                defaultLayout: DEFAULT_LAYOUT,
                partialsDir: TEMPLATE_PARTIALS
            },
            viewPath: TEMPLATE_PATH,
            extName: TEMPLATE_EXTENSION
        }));

        return transporter.sendMail({
            from: noReply,
            to,
            subject,
            template,
            context: {
                ...defaultContext,
                ...context
            }
        });
    }

    // The message is just plain text
    return transporter.sendMail({
        from: noReply,
        to,
        subject,
        text: message
    });
};
