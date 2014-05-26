# Fossa

Backbone powered model interface to MongoDB, thin wrapper around MongoDB. Fossa
uses the API provided by [Backbone][backbone] and proxies it methods to the
[native MongoDB driver][mongodb].

Fossa provides first class database and collection control. This great power
comes with responsibilities. The developer should manage database switches,
seperation of concerns and data integrity. In return Fossa will provide an easy
interface for interaction with the objects in MongoDB.

## Installation

```sh
npm install fossa --save
```

## Tests

Test can be run as follows, make sure all devDependencies have been installed.

```sh
npm test
```

## Documentation

The API of fossa is 1:1 compatible with backbone. For a good reference of available
methods see the [BackboneJS documentation][backbone].

### Table of Contents

**Collection or Model properties**
- [Object.readable](#objectreadable)
- [Object.writable](#objectwritable)
- [Object.fossa](#objectfossa)

- [Collection TOC](#collection-toc)
- [Model TOC](#model-toc)

### Instantiation

Create a new Fossa instance by calling the constructor. After construction Fossa
will expose a model and collection sprinkled with mongoDB proxy methods. The
connection will be prepared and exposed through `Fossa.mongoclient`. The native
C++ parser of MongoDB will be enabled by default.

```js
var fossa = new Fossa({
    host: '127.0.0.1' // defaults to localhost
  , port: '1337' // defaults to 27017
  , options: { native_parser: true } // optional options
});
```

#### Object.readable



### Collection

Fossa will expose a Backbone `Collection`, which can be extended upon to suit your
needs. This offers flexibility, however beware you don't overwrite our
proxied methods. Initialize the Collection before use.

```js
var Accounts = fossa.Collection.extend({
  database: 'observer'
});

//
// Initialize a new account.
//
var accounts = new Accounts;
```

#### Collection TOC

**Fossa.Collection properties**
- [Collection.model](#collectionmodel)

**Fossa.Collection instance**
- [Collection.use](#collectionuse)
-

Fossa Collections have no required keys. However, before saving models a
database should always be provided.

#### Collection.model

#### Collection.use

Collections are the equivalent of a MongoDB database. However, the mapping to a
specific database is not forced or persisted automatically. Any collection can be
switched to another database name. Only data in memory will be saved to the database.

```js
account.use('observer').save(...);
```

### Model

Fossa will expose a Backbone `Model`, which can be extended with additional
properties and values.

```js
var User = fossa.Model.extend({
  firstname: 'Davy',
  lastname: 'Jones'
});
```

#### Model TOC

**Fossa.Model properties**
- [Model.attributeId](#modelattributeid)

**Fossa.Model instance**
- [Model.use](#modeluse)
-

[backbone]: http://backbonejs.org/
[mongodb]: https://github.com/christkv/node-mongodb-native/