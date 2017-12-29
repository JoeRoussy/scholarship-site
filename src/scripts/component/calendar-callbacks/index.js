// Provides a function to fetch classback functions for the events of all date pickers in the app

import { onStartChange as applicationOnStartChange, onEndChange as applicationOnEndChange } from '../application-calandar-controller';

const callbacks = {
    scholarshipApplicationListCalendarStart: {
        onChange: applicationOnStartChange
    },
    scholarshipApplicationListCalendarEnd: {
        onChange: applicationOnEndChange
    }
}

export default (id, type) => {
    if (!callbacks[id]) {
        throw new Error(`Invalid id: ${id}`);
    }

    if (!callbacks[id][type]) {
        throw new Error(`Invalid type: ${type}`);
    }

    return callbacks[id][type];
}
