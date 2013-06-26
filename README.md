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
npm install fossa -save
```

## Tests


## Documentation

Generate api docs with JSDoc!!

### Instantiation

Create a new Fossa instance by calling the constructor. After construction Fossa
will expose a model and collection sprinkled with mongoDB proxy methods. The
connection will be prepared and exposed through `Fossa.mongoclient`. The native 
C++ parser of MongoDB will be enabled by default. 

```js
var fossa = new Fossa(
    host: '127.0.0.1' // defaults to localhost
  , port: '1337' // defaults to 27017
  , options: { native_parser: true } // optional options 
);
```

### Collections

Fossa will expose a Backbone collection, which can be extended upon to suit your
needs. This power offers flexibility, however beware you don't overwrite our
proxied methods. Initialise the Collection before use.

```js
var Account = fossa.Collection.extend({
        name: 'accounts'
      , database: 'observer' 
    });
  , account = new Account;
```

Fossa Collections have no required keys. However, before saving models a
database should always be provided. This can be done by calling `use`, 
consider the following example. 

```js
var Account = new fossa.Collection;
account.use('observer').save(...);
```

### Methods 

[backbone]: http://backbonejs.org/
[mongodb]: https://github.com/christkv/node-mongodb-native/  
