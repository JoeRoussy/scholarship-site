import urlHelper from 'url';

export default () => {
    const pagination = document.getElementById('dataPaginationMenu');

    if (!pagination) {
        return;
    }

    pagination.querySelectorAll('[data-page]')
            .forEach(element => {
                const pageValue = element.getAttribute('data-page');

                element.addEventListener('click', () => {
                    const url = urlHelper.parse(window.location.href, true);
                    url.query.page = pageValue;
                    url.search = null; // If this is present the query object will not be used

                    window.location.href = urlHelper.format(url);
                });
            });
}
