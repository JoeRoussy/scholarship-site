import config from '../../../config';
import mongodb from 'mongodb';

// Returns a promise that resolves into a DB connection
export default () => {
    const MongoClient = mongodb.MongoClient;
    return MongoClient.connect(config.db.url);
}
