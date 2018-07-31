
export default () => {
    document.querySelectorAll('[data-promo-link]')
        .forEach(element => {
            element.addEventListener('click', e => {
                const href = element.getAttribute('data-promo-link');

                if (href) {
                    window.location.href = href;
                }
            });
        });
}