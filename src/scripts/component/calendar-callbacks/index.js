// Provides a function to fetch callback functions for the events of all date pickers in the app.
// Also exposes the date range picker controllers for all applicable date pickers

import datePickerCallbacks from '../date-range-picker-controller';

const _applicationDatePickerCallbacks = datePickerCallbacks();
const _promosDatePickerCallbacks = datePickerCallbacks();

const {
    onEndChange: applicationOnEndChange,
    onStartChange: applicationOnStartChange
} = _applicationDatePickerCallbacks;

const {
    onEndChange: promosOnEndChange,
    onStartChange: promosOnStartChange
} = _promosDatePickerCallbacks;

const callbacks = {
    scholarshipApplicationListCalendarStart: {
        onChange: applicationOnStartChange
    },
    scholarshipApplicationListCalendarEnd: {
        onChange: applicationOnEndChange
    },
    createPromoStartDate: {
        onChange: promosOnStartChange
    },
    createPromoEndDate: {
        onChange: promosOnEndChange
    }
};

export default (id, type) => {
    if (callbacks[id] && callbacks[id][type]) {
        return callbacks[id][type];
    } else {
        return null;
    }
}

export const applicationCallbacks = _applicationDatePickerCallbacks;
export const promosCallbacks = _promosDatePickerCallbacks;
