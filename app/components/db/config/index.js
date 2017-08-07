import mongodb from 'mongodb';

// Returns a promise that resolves into a DB connection
export default () => {
    const MongoClient = mongodb.MongoClient;
    return MongoClient.connect('mongodb://127.0.0.1:27017/scholarship-site')
}
