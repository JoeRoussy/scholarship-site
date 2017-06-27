const controller = require('../controller/searchRouteController.js');

module.exports = app => {

    app.route('/search')
        .get(controller.search);
        
}
