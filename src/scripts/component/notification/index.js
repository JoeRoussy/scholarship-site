import iziToast from 'izitoast';

const validTypes = [
    'info',
    'success',
    'error',
    'warning'
];

const defaultPositioning = {
    position: 'topRight',
    transitionIn: 'fadeInLeft',
    transitionOut: 'fadeOutRight',
    transitionInMobile: 'fadeInLeft',
    transitionOutMobile: 'fadeOutRight'
}

export default () => {
    $('[data-notification-trigger]').each((index, e) => {
        const element = $(e);

        const type = element.attr('data-type');
        const title = element.attr('data-heading');
        const message = element.attr('data-body');

        if (!(title && type)) {
            console.error('Could not find title or type for notification trigger', element);

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
            ...defaultPositioning
        });
    });
};

export const showError = (title, message, preventDrag) => {
    const drag = !preventDrag;

    iziToast.error({
        title,
        message,
        drag,
        ...defaultPositioning
    });
}

export const showWarning = (title, message) => {
    iziToast.warning({
        title,
        message,
        ...defaultPositioning
    });
}

export const showSuccess = (title, message) => {
    iziToast.success({
        title,
        message,
        ...defaultPositioning
    });
}
