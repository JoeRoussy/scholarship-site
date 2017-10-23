import { required, print } from '../../custom-utils';

const addDate = (doc) => ({
    ...doc,
    createdAt: new Date()
});

const validateInsertion = ({
    result = required('result'),
    expectedDocumentsInserted
}) => {
    const {
        result: {
            ok,
            n: actualDocumentsInserted
        } = {}
    } = result;

    if (!ok) {
        return false;
    }

    if (expectedDocumentsInserted && expectedDocumentsInserted !== actualDocumentsInserted) {
        return false;
    }

    return true;
};

// Inserts document(s) into a collection and verifies the insertion worked
export const insert = async ({
    collection = required('collection'),
    document,
    documents,
    returnInsertedDocument
}) => {
    if (!document && !documents) {
        throw new Error('You must provide a single document or multiple documents');
    }

    let insertionResult;
    let isValid;

    const documentToInsert = document ? addDate(document) : null;
    const documentsToInsert = documents ? documents.map(addDate) : null;

    if (documentToInsert) {
        insertionResult = await collection.insertOne(documentToInsert);
        isValid = validateInsertion({
            result: insertionResult,
            expectedDocumentsInserted: 1
        });
    } else {
        insertionResult = await collection.insertMany(documentsToInsert);
        isValid = validateInsertion({
            result: insertionResult,
            expectedDocumentsInserted: documentsToInsert.length
        });
    }

    if (!isValid) {
        throw new Error('Error during validation of insertion');
    }

    if (returnInsertedDocument) {
        if (documentToInsert) {
            return insertionResult.ops[0];
        } else {
            return insertionResult.ops;
        }
    }
};

export const findAndUpdate = async ({
    collection = required('collection'),
    query = required('query'),
    update = required('update'),
    skipValidation = false
}) => {
    let updateResult;

    if (query._id) {
        updateResult = await collection.findOneAndUpdate(query, { $set: update });
    } else {
        const sortOrder = [ [ '_id', 1 ] ]; // Update objects in acending order by id

        updateResult = await collection.findAndModify(query, sortOrder, update);
    }

    const {
        value,
        ok
    } = updateResult;

    if (!skipValidation && !(value && ok)) {
        throw new Error('Update not successful');
    }

    return ok;
};
