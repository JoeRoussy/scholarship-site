export default () => {
    const hamburgerButton = document.getElementById('hamburgerButton');
    const menu = document.getElementById('navigationMenu');
    let menuOpen = false;

    if (hamburgerButton && menu) {
        const hamburgerButtonIcon = hamburgerButton.querySelector('i');

        if (hamburgerButtonIcon) {
            hamburgerButton.addEventListener('click', () => {
                if (menuOpen) {
                    hamburgerButtonIcon.classList.remove('close');
                    hamburgerButtonIcon.classList.add('sidebar');
                    menu.classList.remove('showMobileMenu');
                    menuOpen = false;
                } else {
                    hamburgerButtonIcon.classList.remove('sidebar');
                    hamburgerButtonIcon.classList.add('close');
                    menu.classList.add('showMobileMenu');
                    menuOpen = true;
                }
            });
        }
    }
}
