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
                    //showSuccess('Program Saved', 'See your saved programs in your profile');
                    console.log('Success');
                    // TODO: reload current page with a success query parameter
                })
                .catch(() => {
                    showError('Error', 'That program could not be saved. Please try again later');
                });
        });
    });

    // Configure the delete button clicks to remove a program from the favorite list
};