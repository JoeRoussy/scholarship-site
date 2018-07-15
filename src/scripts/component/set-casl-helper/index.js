/*
    Handles the button clicks for the casl consent modal. Note that this is shown to people who manage
    to register without setting their casl consent. An example of this is logging in with a social
    media account.
*/

import axios from 'axios';
import { showSuccess } from '../notification';

export default () => {
    $('[data-deny-casl-button]').click(() => {
        axios.post('/api/users/me/rejectCasl')
            .then(() => {
                showSuccess('Got it', 'We will not contact you other than to respond to your requests or submissions');
            });
    });

    $('[data-agree-to-casl-button]').click(() => {
        axios.post('/api/users/me/acceptCasl')
            .then(() => {
                showSuccess('Awesome!', 'Be on the lookout for some exciting news from us!');
            });
    });
};