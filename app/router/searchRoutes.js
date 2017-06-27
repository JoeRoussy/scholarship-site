const controller = require('../controller/searchRouteController.js');

module.exports = app => {

    app.get('/programs', controller.search);

}
