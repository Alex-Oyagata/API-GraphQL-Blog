const pgPromise = require('pg-promise')
const config = {
    host: 'localhost',
    port:5432,
    database: 'blog',
    user: 'postgres',
    password: 'ADMIN',
}
const pgp = pgPromise({})
const db = pgp(config)

exports.db = db
