# scholarship-site
TODO...

DB:
In the programs collection, there needs to be a text index on the name field, create this using `db.getCollection('programs').createIndex({name: "text"})`.
We also need to do the same thing with the universities collection.
All collections with a text index need to have a language column

Config:
Config elements should be exported from `app/config/index.js`. TODO: Enumerate exact config elements
