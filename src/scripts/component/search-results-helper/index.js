

export default () => {
    document.querySelectorAll('[data-program-link]')
        .forEach(element => {
            element.addEventListener('click', e => {
                const href = element.getAttribute('data-program-link');

                if (href) {
                    window.location.href = href;
                }
            });
        });
}
