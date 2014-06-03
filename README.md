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

## Documentation

The API of fossa is 1:1 compatible with backbone. For a good reference of available
methods see the [BackboneJS documentation][backbone].

### Table of Contents

**Collection or Model properties**
- [Object.readable](#objectreadable)
- [Object.writable](#objectwritable)
- [Object.fossa](#objectfossa)

**Collection or Model functions**
- [Collection.use](#collectionuse)
- [Collection.client](#collectionclient)
- [Collection.define](#collectiondefine)

- [Collection](#collection)
- [Model](#model)

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

Create a read-only property on the `Collection` or `Model`. This method is a
shorthand for `Object.defineProperty` and not enumerable or writable.

- **key**: _{String}_ required property key
- **value**: _{Mixed}_ required value can be string, array, object or function

```js
var collection = new fossa.Collection;
collection.readable('url', 'http://not.changable.after');
```

#### Object.writable

Create a writable property on the `Collection` or `Model`. This method is a
shorthand for `Object.defineProperty` with writable and configurable properties.

- **key**: _{String}_ required property key
- **value**: _{Mixed}_ required value can be string, array, object or function

```js
var model = new fossa.Model;
model.writable('url', 'http://is.changeable.after');
model.url = 'http://changed.url.com';
```

#### Object.fossa

Read-only reference to the `Fossa` instance. On construction of the `Collection`
or `Model` the instance is set. The instance is used to connect to the database.

```js
var model = new fossa.Model;
model.fossa.connect('mydatabase', 'mycollection', function done(err, client) {
  console.log('connected to mydatabase');
});
```

#### Object.use

Collections are the equivalent of a MongoDB database. However, the mapping to a
specific database is not forced or persisted automatically. Any collection can be
switched to another database name. Only data in memory will be saved to the database.

- **database**: _{String}_ required database name

```js
account.use('observer').save(...);
```

#### Object.client

Establishes a connection with MongoDB. The `Fossa` instance will make sure
connections are made from one pool. The completion callback receives two arguments.
An error (if any) argument and an object representating a connected client.

- **done**: _{Function}_ required completion callback

```js
account.client(function done(err, client) {
  console.log(client);
})
```

#### Object.define

Helper method to define a key:value on the `Collection` or a `Model`.

- **key**: _{String}_ required key
- **value**: _{Mixed}_ required value

```js
account.define('username', 'idontwantanaccount');
```

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
- [Collection._database](#collection-database)

**Fossa.Collection instance**
- [Collection.id](#collectionid)
- [Collection.sync](#collectionsync)

Fossa Collections have no required keys. However, before saving models a
database should always be provided.

#### Collection.model

The default model for a `Collection` is the `fossa.Model. Calling `Collection.add`
will create a new Model of that type on the Collection. If you like to define a
different default Model, extend the Collection.

```js
var Accounts = fossa.Collection.extend({
  model: fossa.Model.extend({
    idAttribute: 'ID'
  })
})
```

#### Collection._database

Used to store the current database name. All synchronization will be done against
the database set on this key. Can be set by prodiving `options.database = 'mydb` to
the constructor of the Collection.

#### Collection.id

Find a `Model` in the `Collection` by `ObjectId`. An `ObjectId` is a
[native property][objectid] stored on each MongoDB model. Only one model is
returned. The find is performed against the Models in Collection memory only.

- **key**: _{ObjectId}_ required 24 byte hex string, valid MongoDB ObjectId

```js
var user = account.id('4cdfb11e1f3c000000007822');
console.log(user);
```

#### Collection.sync

Synchronise the Models in Collection memory to MongoDB. Manually calling this
method is usally not required or advised. The global `Backbone.sync` is also
overwritten and will proxy to this method. To mimic [Backbone.sync][backbonesync]
patterns a promise is returned.

- **method**: _{String}_ optional CREATE, READ, UPDATE or DELETE, defaults to create
- **collection**: _{Collection}_ optional collection object or this
- **options**: _{Object}_ optional options

```js
account.sync('create', account, {}).done(function done(err, result) {
  console.log(result);
});
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

## Tests

Test can be run as follows, make sure all devDependencies have been installed.

```sh
npm test
```

[backbone]: http://backbonejs.org/
[mongodb]: https://github.com/christkv/node-mongodb-native/
[objectid]: http://mongodb.github.io/node-mongodb-native/api-bson-generated/objectid.html
[backbonesync]: http://backbonejs.org/#Sync