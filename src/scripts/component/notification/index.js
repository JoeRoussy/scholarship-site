import iziToast from 'izitoast';

export default () => {
    $('[data-notification-trigger]').each((index, e) => {
        const element = $(e);

        const title = element.attr('data-heading');
        const message = element.attr('data-body');

        if (!(title && message)) {
            console.error('Could not find title or heading for body for notification trigger', element);

            return;
        }

        iziToast.success({
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
