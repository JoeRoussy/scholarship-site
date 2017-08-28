import { search, home, aboutUs, contact, programDetails } from '../controller/app.js'
import { required } from '../components/custom-utils';


export default ({
    app = required('app'),
    db = required('db')
}) => {

    app.get('/', home);
    app.get('/about-us', aboutUs);
    app.get('/contact', contact);

    app.route('/search')
        .get(search({
            provincesCollection: db.collection('provinces'),
            universitiesCollection: db.collection('universities'),
            programsCollection: db.collection('programs')
        }));

    app.get('/programs/:programId', programDetails({
        programsCollection: db.collection('programs')
    }));

}
