import express from 'express';
import language from './components/language';
import loadContentConfig from './components/content';
import templateConfig from './components/template-config';
import basicRouteConfig from './router/basicRoutes.js';
import searchRouteConfig from './router/searchRoutes.js';

const app = express();


app.use(express.static('public'));
app.use(language);

loadContentConfig(app);
templateConfig(app);
basicRouteConfig(app);
searchRouteConfig(app);


app.listen(3000, () => console.log('App is listening on port 3000'));
