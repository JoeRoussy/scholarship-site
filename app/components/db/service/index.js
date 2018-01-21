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

// Will return boolean value indicating operation success if skipValidation is set to true
export const findAndUpdate = async ({
    collection = required('collection'),
    query = required('query'),
    update,
    uniquePush,
    skipValidation = false
}) => {
    // Need to pass an update or a unique push
    if (!update && !uniquePush) {
        throw new Error('Missing update or unique push object');
    }

    let updateResult;
    let updateObj;

    if (update) {
        updateObj = {
            $set: update
        };
    }

    if (uniquePush) {
        updateObj = {
            ...updateObj,
            $addToSet: uniquePush
        };
    }

    if (query._id) {
        updateResult = await collection.findOneAndUpdate(query, updateObj);
    } else {
        updateResult = await collection.updateMany(query, updateObj);
    }

    if (!skipValidation) {
        if (query._id) {
            return singleUpdateValidation(updateResult);
        } else {
            return multipleUpdateValidation(updateResult);
        }
    }
};

// Since the callbacks for findOneAndUpdate and updateMany have a different structure, encapsulate the complexity
// of verification in these two functions
function singleUpdateValidation(dbResult) {
    const {
        value,
        ok
    } = dbResult;

    if (!(value && ok)) {
        throw new Error('Update not successful');
    }

    return ok;
}

function multipleUpdateValidation(dbResult) {
    const {
        result: {
            nModified,
            ok
        } = {}
    } = dbResult;

    if (!(nModified && ok)) {
        throw new Error('Update not successful');
    }

    return ok;
}
