# scholarship-site
TODO...

DB:
In the programs collection, there needs to be a text index on the name field, create this using `db.getCollection('programs').createIndex({name: "text"})`.
We also need to do the same thing with the universities collection.
All collections with a text index need to have a language column

Config:
Config elements should be exported from `app/config/index.js`. TODO: Enumerate exact config elements

Semantic-UI:
This site is built on top of [Semantic-UI](https://semantic-ui.com/). The semantic-ui components of the site must be built using `gulp buildSemantic` before running the standard `gulp` command during initial set up or after semantic-ui theming changes have been made.

iziToast:
This project makes use of iziToast for notifications. The js configuration is already done automatically but the css file should be placed in the /src/styles/vendor folder.
