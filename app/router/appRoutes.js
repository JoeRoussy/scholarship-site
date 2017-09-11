import { search, setupSearchPagination, home, contact, programDetails, processContact } from '../controller/app.js'
import { required } from '../components/custom-utils';
import { sendMessage as sendMailMessage, getMailMessage } from '../components/mail-sender';
import { insert as insertInDb } from '../components/db/service';

export default ({
    app = required('app'),
    db = required('db')
}) => {

    app.get('/', home);

    app.route('/contact')
        .get(contact)
        .post([
            processContact({
                contactCollection: db.collection('contactSubmissions'),
                sendMailMessage,
                getMailMessage,
                insertInDb
            }),
            contact
        ]);

    app.route('/search')
        .get([
            search({
                provincesCollection: db.collection('provinces'),
                universitiesCollection: db.collection('universities'),
                programsCollection: db.collection('programs')
            }),
            setupSearchPagination
        ]);

    app.get('/programs/:programId', programDetails({
        programsCollection: db.collection('programs')
    }));

}
