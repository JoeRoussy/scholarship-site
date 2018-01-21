import request from 'request-promise';
import { showError } from '../notification';
import url from 'url';

export default () => {
    $('[data-promo-drawing-button]').each((i, e) => {
        const button = $(e);
        const errorTitle = button.attr('data-error-title');
        const errorMessage = button.attr('data-error-message');

        button.on('click', () => {
            const promoId = button.attr('data-promo-id');

            request(url.resolve(window.location.href, `/api/promo/${promoId}/winner`))
                .then(res => {
                    location.reload(true);
                })
                .catch(e => {
                    button.removeClass('loading');
                    showError(errorTitle, errorMessage);
                });

            button.addClass('loading');
        });
    });
};
