import bunyan from 'bunyan';
import { required } from '../custom-utils';

// Get a logger with certain options
export const getLogger = ({
    name = required('name'),
    rotatingFile = `/var/log/${name}/log.log`,
    errorFile = `/var/log/${name}/errors.log`
}) => {
    const streams = [
        {
            type: 'rotating-file',
            path: rotatingFile,
            period: '1d',
            count: 15,
            level: bunyan.INFO
        },
        {
            path: errorFile,
            level: bunyan.ERROR
        }
    ];

    let devStreams = [];

    // In dev we'll want to stream everything to the console.
    if (process.env.NODE_ENV !== 'production') {
        devStreams.push({
            stream: process.stdout,
            level: bunyan.TRACE
        });
    }

    const log = bunyan.createLogger({
        name,
        streams: [ ...streams, ...devStreams ],
        serializers: bunyan.stdSerializers,
        src: process.env.NODE_ENV !== 'production' // Only show source in dev (because finding it is slow)
    });

    log.on('error', (err, stream) => {
        console.log(`Error writing to stream: ${JSON.stringify(err)}`);
    });

    return log;
};

// Returns a child logger for baseLogger including the additional fields
export const getChildLogger = ({
    baseLogger = required('baseLogger'),
    additionalFields = required('additionalFields')
}) => baseLogger.child(additionalFields);
