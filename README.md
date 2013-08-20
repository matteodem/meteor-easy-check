Meteor CRUD Generator
=====================

This package provides

* Safe CRUD Meteor.methods for a specified collection
* Creates the markup (a table) for a specified schema
* Handles all CRUD Events with a specific Meteor Template

### How to use

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

It reads the _name property of the "new Meteor.Collection" and creates a specific template called "test_crud" (with handled CRUD Events).

### Running tinytest tests

```
meteor test-packages crud-generator
```