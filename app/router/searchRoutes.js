import { search } from '../controller/searchRouteController.js'
import { required } from '../components/custom-utils';

export default ({
    app = required('app'),
    db = required('db')
}) => {

    app.route('/search')
        .get(search({
            provincesCollection: db.collection('provinces'),
            universitiesCollection: db.collection('universities'),
            programsCollection: db.collection('programs')
        }));

}
