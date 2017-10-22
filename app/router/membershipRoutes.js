import { membership, processMembership, membershipAccept } from '../controller/membership';
import { required } from '../components/custom-utils';
import { getChildLogger } from '../components/log-factory';

export default ({
    app = required('app'),
    db = required('db'),
    baseLogger = required('baseLogger')
}) => {
    app.route('/membership')
        .get(membership)
        .post(processMembership({
            transactionsCollection: db.collection('transactions'),
            logger: getChildLogger({
                baseLogger,
                additionalFields: {
                    module: 'memberships-process'
                }
            })
        }));

    app.get('/membership/success', membershipAccept({
        transactionsCollection: db.collection('transactions'),
        usersCollection: db.collection('users'),
        logger: getChildLogger({
            baseLogger,
            additionalFields: {
                module: 'memberships-accept'
            }
        })
    }));
}
