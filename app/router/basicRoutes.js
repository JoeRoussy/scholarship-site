const controller = require('../controller/basicRouteController.js');

module.exports = app => {

    app.get('/', controller.home);
    app.get('/about-us', controller.aboutUs);
    app.get('/contact', controller.contact);

}
