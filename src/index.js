
const path = require('path');

const {db} = require('../config/database');
const {ApolloServer} = require('apollo-server');
const{fileLoader, mergeTypes} = require('merge-graphql-schemas');

//Inicialization
const typeDefs = mergeTypes(fileLoader(path.join(__dirname, '../type-system/schema.graphql')));
const resolvers = require('../resolvers/Blog.resolver');

//Configuration
const server = new ApolloServer({
    typeDefs,
    resolvers,
});

server.listen(4000).then(({url}) => {
    console.log(`Server is running at ${url}`);
    console.log('run in GraphQL Playground: http://localhost:4000/graphql');
});