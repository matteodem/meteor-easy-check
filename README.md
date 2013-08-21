Meteor CRUD Generator
=====================

This package provides

* Safe CRUD Meteor.methods for a Meteor.Collection
* Creates the markup (a table) for a specified schema
* Handles all CRUD Events with a specific Meteor Template

```
mrt add crud-generator
```

## How to use

This is how a basic setup looks like:

```
crud = new Meteor.CRUDGenerator(
	new Meteor.Collection('test'), 
	{
    	'id' : 'number',
	    'name' : 'string:64',
    	'mail' : 'string:84:email',
	    'description' : 'string:255',
    	'category' : 'string:-1'
	}
);
```

This will create a specific template called "test_crud" (with handled CRUD Events). 

It's also recommended to disable the insecure package and give no right to insert, update or remove at all (since there are safe, self-validating Meteor.methods for all the database actions).


### Advanced configuration

This package exposes a global variable called ```Meteor.CRUDGenerator```. The parameters are

```
Meteor.CRUDGenerator(collection, schema, options);
```

* collection is an ```instanceof``` Meteor.Collection
* schema is an object that looks like defined in the basic setup
	* 'field_name' : 'contentType:length:specialProperty'
	* Valid content types are:
		* date
		* array**
		* string
		* number
		* object**
		* boolean**
	* The length is a number, if unlimited set it to -1 or just don't set it
	* For now the special property is a html5 type (date, email)
* options can have following properties
	* 'users' array with all the users that have CRUD privileges for the collection
		* Anonymous does never have privileges to edit anything! (Only Read)
	* 'markup' object with following properties
		* 'styling' string which can be either 'pure-css' or 'bootstrap 3' as of now
		* 'additionalFormClasses' and 'additionalTableClasses' for user defined classes
	* 'errorCallback' function which is executed when there's a Meteor.Error
		* e.g for visual feedback on the site



\** This content types won't be rendered in the html table

## Running tinytest

```
meteor test-packages crud-generator
```