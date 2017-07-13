import mongoose from 'mongoose';
import { RuntimeError } from '../../custom-utils';

// Connects to the db and sets up the schemas.
// Returns a promise that resolves to undefined of the connection is successful
// and re
export default () => {
    // Tell mongoose to use native promises
    mongoose.Promise = Promise;

    return mongoose.connect('mongodb://localhost/scholarship-site')
        .then(() => {
            console.log('We are connected!!!!');

            // Setup all the models

            return;
        })
        .catch(err => {
            throw new RuntimeError({
                msg: 'Error connecting to mongo',
                err
            });
        });
}
