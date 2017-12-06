import iziToast from 'izitoast';

const validTypes = [
    'info',
    'success',
    'error',
    'warning'
];

export default () => {
    $('[data-notification-trigger]').each((index, e) => {
        const element = $(e);

        const type = element.attr('data-type');
        const title = element.attr('data-heading');
        const message = element.attr('data-body');

        if (!(title && message && type)) {
            console.error('Could not find title or heading for body for notification trigger', element);

            return;
        }

        const isValidType = validTypes.some(x => x === type);

        if (!isValidType) {
            console.error(`Invalid type: ${type}`, element);

            return;
        }

        iziToast[type]({
            title,
            message,
            position: 'topRight',
            transitionIn: 'fadeInLeft',
            transitionOut: 'fadeOutRight',
            transitionInMobile: 'fadeInLeft',
            transitionOutMobile: 'fadeOutRight'
        });
    });
};
