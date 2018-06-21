

export default () => {
    document.querySelectorAll('[data-program-link]')
        .forEach(element => {
            element.addEventListener('click', e => {
                // Only move forward if this is not a click meant for the favorite program buttons
                const target = e.target;

                if (target.hasAttribute('data-add-favorite-program-button') || target.hasAttribute('data-delete-favorite-program-button')) {
                    return;
                }

                const href = element.getAttribute('data-program-link');

                if (href) {
                    window.location.href = href;
                }
            });
        });
}
