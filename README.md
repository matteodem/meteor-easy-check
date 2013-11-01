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
PersonChecker.check({ something : 'random' }); // return false

```

You could use that and create secure Meteor.methods with it… 
or just **add your Meteor.Collection as the 2nd parameter** which does that for you:

```
var CarsChecker = new EasyCheck({
	'company' : 'string' 
	'model' : {
		type : 'string',
		maxLength : 255,
		required : false
	}
	'isNew' : 'boolean
}, CarsCollection); // CarsCollection is an instance of Meteor.Collection

// You now got following methods on your colleciton, with validation
CarsCollection.easyInsert(doc, [callback]);
CarsCollection.easyUpdate(selector, modifier, [options], [callback]);
CarsCollection.easyRemove(selector, [callback]);

```



## How to install
```
mrt add easy-check
```

More documentation to come
