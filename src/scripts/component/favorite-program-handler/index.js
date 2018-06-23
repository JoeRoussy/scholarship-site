// Handles the button clicks for adding and removing programs from a user's favorites list.

import axios from 'axios';
import url from 'url';

import { showError } from '../notification';

export default () => {
    // Configure the button clicks for adding a program to the favorites list
    $('[data-add-favorite-program-button]').each((index, el) => {
        const element = $(el);
        const programId = element.attr('data-program-id');

        if (!programId) {
            throw new Error('Could not find program id in data attribute: data-program-id');
        }
        
        element.click(() => {
            axios.post('/api/users/me/favoritePrograms', {
                programId
            })
                .then(() => {
                    // Pase the QS into an object
                    let urlObj = url.parse(window.location.href, true);

                    delete urlObj.query.programFavoriteDeleteSuccess; // Remove from QS if present

                    urlObj.query.programFavoriteSaveSuccess = true;
                    urlObj.search = null;

                    window.location.href = url.format(urlObj);
                })
                .catch(() => {
                    showError('Error', 'That program could not be saved. Please try again later');
                });
        });
    });

    // Configure the delete button clicks to remove a program from the favorite list
    $('[data-remove-favorite-program-button]').each((index, el) => {
        const element = $(el);
        const programId = element.attr('data-program-id');

        if (!programId) {
            throw new Error('Could not find program id in data attribute: data-program-id');
        }
        
        element.click(() => {
            axios.delete(`/api/users/me/favoritePrograms/${programId}`)
                .then(() => {
                    // Pase the QS into an object
                    let urlObj = url.parse(window.location.href, true);

                    delete urlObj.query.programFavoriteSaveSuccess; // Remove from QS if present

                    urlObj.query.programFavoriteDeleteSuccess = true;
                    urlObj.search = null;

                    window.location.href = url.format(urlObj);
                })
                .catch((e) => {
                    showError('Error', 'We could not remove that from your favorites. Please try again later.');
                });
        });
    });
};