# scholarship-site
TODO...

DB:
In the programs collection, there needs to be a text index on the name field, create this using `db.getCollection('programs').createIndex({name: "text"})`.
We also need to do the same thing with the universities collection.
All collections with a text index need to have a language column

Config:
Config elements should be exported from `app/config/index.js`. TODO: Enumerate exact config elements

Semantic-UI:
This site is built on top of [Semantic-UI](https://semantic-ui.com/). The semantic-ui components of the site must be built using `gulp buildSemantic` before running the standard `gulp` command during initial set up or after semantic-ui theming changes have been made. The semantic.json file includes configuration for the destination of the compiled code this gulp taks cenerates.

This site also used a plugin for semantic ui that provides a [date picker](https://www.npmjs.com/package/semantic-ui-calendar). This src files were copied from this folder into the semantic folder for this project so the calendar module can be included in the semantic build. I also added 'calendar' to the list of modules in `semantic/src/definitions/globals/site.js` and `/semantic/src/theme.config` and `/semantic/tasks/config/defaults.js`. Lastly, I added a reference to the calendar module in the less imports located in `/semantic/src/semantic.less`

iziToast:
This project makes use of iziToast for notifications. The js configuration is already done automatically but the css file should be placed in the /src/styles/vendor folder.
