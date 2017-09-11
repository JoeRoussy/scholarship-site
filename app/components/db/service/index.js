import { required, print } from '../../custom-utils';

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

    if (document) {
        insertionResult = await collection.insertOne(document);
        isValid = validateInsertion({
            result: insertionResult,
            expectedDocumentsInserted: 1
        });
    } else {
        insertionResult = await collection.insertOMany(documents);
        isValid = validateInsertion({
            result: insertionResult,
            expectedDocumentsInserted: documents.length
        });
    }

    if (!isValid) {
        throw new Error('Error during validation of insertion');
    }

    if (returnInsertedDocument) {
        if (document) {
            return insertionResult.ops[0];
        } else {
            return insertionResult.ops;
        }
    }
};
