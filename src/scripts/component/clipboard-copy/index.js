import Clipboard from 'clipboard';
import { showSuccess, showError } from '../notification'

/*
    Sets up copying of values to clipboard using clipboard.js. You must pass an array of trigger ids into the function.
    If the target is a link, the href will be used as the value, otherwise the value of the 'data-clipboard-text' attribute
    on the target will be copied.

    In the event the borwser does not support clipboard copying, an error will be shown using the notification module.
    The title of the error notification is defined by the data-error-title attribute of the trigger. The message is defined
    by the data-error-message attribute. Note that the message attribute must act as a template wherein '{value}' is replaced
    with what would have been copied to the clipboard

    If the copy is successful, a success notification is shown as defined by the 'data-success-title' and 'data-success-message'
    attributes of the trigger.
*/
export default (ids) => {
    ids.forEach(id => {
        const element = $(`#${id}`);

        if (!element.length) {
            return;
        }

        // Make sure the links are not followed
        element.on('click', e => {
            if (e.target.href) {
                e.preventDefault();
            }
        });

        const clipboard = new Clipboard(`#${id}`, {
            text: trigger => getValueForTrigger(trigger)
        });

        clipboard.on('success', e => {
            const title = e.trigger.getAttribute('data-success-title');
            const message = e.trigger.getAttribute('data-success-message');

            showSuccess(title, message);
        });

        clipboard.on('error', e => {
            const title = e.trigger.getAttribute('data-error-title');
            const messageTemplate = e.trigger.getAttribute('data-error-message');
            const value = getValueForTrigger(e.trigger);
            const message = messageTemplate.replace('{value}', value);

            showError(title, message);
        });
    });
};

function getValueForTrigger(trigger) {
    if (trigger.href) {
        return trigger.href;
    }

    return trigger.getAttribute('data-clipboard-text');
}
