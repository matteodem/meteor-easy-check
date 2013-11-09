Meteor Easy Check
=====================

This package makes it as simple as possible to check objects, e.g. for a Meteor.Collection.

## Quick Intro

Create a checker like that:

```
var PersonChecker = new EasyCheck({
	'name' : 'string',
	'hasCar' : {
		type : 'boolean',
		required : false
	}
});

PersonChecker.check({ name :  'Peter' }); // returns true
PersonChecker.check({ something : 'random' }); // returns false

```

You could use that and create secure Meteor.methods with it… or just add your Meteor.Collection as the 2nd parameter:

```
var CarsChecker = new EasyCheck({
	'company' : 'string',
	'model' : {
		type : 'string',
		maxLength : 255,
		required : false
	},
	'isNew' : 'boolean'
}, CarsCollection); // CarsCollection is an instance of Meteor.Collection

// You now got following methods on your collection, with validation
CarsCollection.easyInsert(doc, [callback]);
CarsCollection.easyUpdate(selector, modifier, [options], [callback]);
CarsCollection.easyRemove(selector, [callback]);

```

## How to install
```
mrt add easy-check
```


## Possible configurations to a field
There's quite some options to specify the values you want to check against

```
{
    type : 'string',    # the type, such as boolean, number...
    required : false,   # is the field is required
    maxLength : 255     # the maximum length
    minLength : 10      # the minimum length
    regex: /[\w]+/      # a regex pattern to test() against
    contains : %type%   # only if array, can specify what type of values it contains
}
```


### Field types

* 'string'
* 'booolean'
* 'array'
* 'object'
* 'date'
* instanceof EasyCheck

## Options

You can also add an options object as a third parameter, for example:
```
new EasyCheck(schema, collection, options);
```

Following options can be configured:
```
{
    onInsert : function (document),  # act on an insert
    onUpdate : function (selector, modifier, options) # act on an update
    onCheckUpdatedDoc : function (document) # act on a document that has been updated, if false then it reverts the update
    onRemove : function (id) # act on a remove
    onError  : function (errors) # act when there were errors when checking a document
}
```
