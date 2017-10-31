import {
    search,
    setupSearchPagination,
    home,
    error,
    studyingInCanada,
    contact,
    programDetails,
    processContact,
    scholarshipApplication,
    processScholarshipApplication
} from '../controller/app.js';
import { required } from '../components/custom-utils';
import { sendMessage as sendMailMessage, getContactMailMessage, getApplicationMailMessage } from '../components/mail-sender';
import { insert as insertInDb } from '../components/db/service';

export default ({
    app = required('app'),
    db = required('db')
}) => {

    app.get('/', home);

    app.get('/error', error);

    app.get('/studying-in-canada', studyingInCanada);

    app.route('/contact')
        .get(contact)
        .post([
            processContact({
                contactCollection: db.collection('contactSubmissions'),
                sendMailMessage,
                getMailMessage: getContactMailMessage,
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

    app.route('/scholarship-application')
        .get(scholarshipApplication)
        .post([
            processScholarshipApplication({
                scholarshipApplicationCollection: db.collection('scholarshipApplications'),
                sendMailMessage,
                getMailMessage: getApplicationMailMessage,
                insertInDb
            }),
            scholarshipApplication
        ]);

}
