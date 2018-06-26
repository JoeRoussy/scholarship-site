import nodemailer from 'nodemailer';
import nodemailerHandlebars from 'nodemailer-express-handlebars';
import inlineCss from 'nodemailer-juice';
import marked from 'marked';

import config from '../../config';

// Local consts
const TEMPLATE_PATH = 'app/components/mail-sender/templates';
const TEMPLATE_LAYOUT_PATH = 'app/components/mail-sender/templates/layouts';
const TEMPLATE_EXTENSION = '.hbs';
const DEFAULT_LAYOUT = 'main';
const TEMPLATE_PARTIALS = 'app/components/mail-sender/templates/partials';

const {
    host: HOST
} = config;

if (!HOST) {
    throw new Error('Missing HOST config element');
}

const helpers = {
    md(text) {
        if (!text) {
            return;
        }

        const renderer = new marked.Renderer();
        renderer.paragraph = (text) => text;

        return marked(text, {
            renderer
        });
    },
    lineEndingsToBreaks(text) {
        if (!text) {
            return;
        }

        return text.replace(/\n/g, '<br>');
    }
};

const defaultContext = {
    rootUrl: HOST
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
    const {
        name,
        isMember
    } = user;

    return {
        context: {
            name,
            isMember,
            preheader: 'Thank you for joining the Canada Higher Education House!'
        },
        template: 'signUp'
    };
};

export const getMembershipAfterSignUpMailMessage = ({
    user
}) => ({
    context: {
        name: user.name,
        preheader: 'Thank you for upgrading to a full membership!'
    },
    template: 'membershipAfterSignUp'
});

export const getApplicationConfirmationMailMessage = ({
    name,
    application
}) => ({
    context: {
        name,
        application
    },
    template: 'scholarshipApplicationConfirmation'
});

export const getPasswordResetMailMessage = ({
    user,
    passwordResetLink
}) => ({
    context: {
        name: user.name,
        passwordResetLink
    },
    template: 'passwordReset'
});

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
                partialsDir: TEMPLATE_PARTIALS,
                helpers
            },
            viewPath: TEMPLATE_PATH,
            extName: TEMPLATE_EXTENSION
        }));

        transporter.use('compile', inlineCss());

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
