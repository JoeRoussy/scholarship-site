const controller = require('../controller/basicRouteController.js');

module.exports = app => {

    app.get('/', controller.home);

}
