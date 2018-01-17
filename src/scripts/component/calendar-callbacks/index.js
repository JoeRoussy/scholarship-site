// Provides a function to fetch callback functions for the events of all date pickers in the app.
// Also exposes the date range picker controllers for all applicable date pickers

import datePickerCallbacks from '../date-range-picker-controller';
import { onChange as createPromoOnChange } from '../create-promo-controller';

const _applicationDatePickerCallbacks = datePickerCallbacks();
const _promosDatePickerCallbacks = datePickerCallbacks();

const startCreatePromoOnChange = createPromoOnChange('hiddenCreatePromoStartDate');
const endCreatePromoOnChange = createPromoOnChange('hiddenCreatePromoEndDate');

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
        onChange: function(date) {
            return applicationOnStartChange($(this), date);
        }
    },
    scholarshipApplicationListCalendarEnd: {
        onChange: function(date) {
            return applicationOnEndChange($(this), date);
        }
    },
    createPromoStartDate: {
        onChange: function(date) {
            const rangeResult = promosOnStartChange($(this), date);

            if (rangeResult) {
                startCreatePromoOnChange(date);
            }

            // Need to return this value to see if we should actually execute that change
            return rangeResult;
        }
    },
    createPromoEndDate: {
        onChange: function(date) {
            const rangeResult = promosOnEndChange($(this), date);

            if (rangeResult) {
                endCreatePromoOnChange(date);
            }

            // Need to return this value to see if we should actually execute that change
            return rangeResult;
        }
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
