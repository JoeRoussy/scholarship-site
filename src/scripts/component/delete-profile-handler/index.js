import request from 'request-promise';
import url from 'url';

import { showError } from '../notification';

const func = () => {
    $('[data-delete-profile-button]').each((index, el) => {
        const element = $(el);
        const errorTitle = element.attr('data-error-title');
        const errorMessage = element.attr('data-error-message');

        element.click(() => {
            request.delete(url.resolve(window.location.href, '/api/users/me'))
                .then(() => {
                    window.location.href = '/?profileDeleteSuccess=true';
                })
                .catch(() => {
                    showError(errorTitle, errorMessage);
                });
        });
    });
};

export default func;