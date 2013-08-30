(function () {
    // @see https://github.com/matteodem/meteor-crud-generator/wiki/New-possible-features

    var callback,
        CRUDGenerator,
        // Throw a Meteor Error together with a user specified callback
        throwMeteorError = function (message) {
            if (_.isFunction(callback)) {
                callback(message);
            }

            throw new Meteor.Error(message);
        },
        // Checks the user rights with provided array users
        checkUserRights = function (users, anonymousCanEdit) {
            var currentUser = Meteor.user();

            if (!_.isObject(currentUser) && !anonymousCanEdit) {
                throwMeteorError("Anonymous is not privileged to execute this CRUD operation!");
            }

            if (_.isUndefined(users)) {
                return true;
            }

            if (!_.contains(users, currentUser.username)) {
                throwMeteorError("You (" + currentUser.username +") are not privileged to execute this CRUD operation!");
            }

            return true;
        },
        // Returns the size of an object (only property)
        objectSize = function (obj) {
            var size = 0, key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) size++;
            }
            return size;
        };

    /**
     * The constructor for the globally useable CRUDGenerator
     *
     * @param {Meteor.Collection} collection    The Mongo Collection which will have the crud operations performed on
     * @param {Object} schema                   The 'table' schema defined for the collection
     * @param {Object} options                  Additional options defined, suchs as user rights, optional css classes etc.
     * @class CRUDGenerator
     * @constructor
     *
     * @return void
     */
    CRUDGenerator = function (collection, schema, options) {
        var that = this,
            crudFunctions = {},
            name = collection._name;

        options = options || {};
        options.anonymousEditable = options.anonymousEditable || false;

        if (_.isFunction(options.errorCallback)) {
            callback = options.errorCallback;
        }

        this.schema = schema;
        this.options = options;
        this.collectionName = name;

        if (Meteor.isClient) {
            this.markupGenerator = new Meteor.CRUDMarkupGenerator(options.markup);
            // Define crud specific template
            Template.__define__(name + '_crud', function () {
                return that.markupGenerator.generateOverviewTable(collection, schema, name);
            });
            // Define crud specific template events
            Template[name + '_crud'].events({
                'click .crud-gui-delete-button' : function (e) {
                    that.deleteClickHandler(e.target);
                },
                'click .crud-gui-edit-button' : function (e) {
                    that.editClickHandler(e.target);
                },
                'click .crud-gui-create-button' : function (e) {
                    that.createClickHandler(e.target);
                }
            });
        }


        // Create safe CRUD methods
        crudFunctions[name + '_insert'] = function (obj, callback) {
            checkUserRights(that.options.users, options.anonymousEditable);

            if (that.validCRUDObject(obj, schema)) {
                return collection.insert(obj, callback);
            }
        };
        crudFunctions[name + '_update'] = function (selector, modifier, uOptions, callback) {
            var newDoc,
                oldDocs = collection.find(selector).fetch();

            checkUserRights(that.options.users, options.anonymousEditable);

            collection.update(selector, modifier, uOptions, callback);

            _.each(oldDocs, function (oldDoc) {
                newDoc = collection.findOne(oldDoc._id);

                if (!that.validCRUDObject(newDoc, schema)) {
                    collection.update(oldDoc._id, oldDoc);
                    throwMeteorError("Update Operation reverted, the new document doesn't match the schema definition!");
                }
            });
        };
        crudFunctions[name + '_remove'] = function (id) {
            collection.remove(id);
        };

        Meteor.methods(crudFunctions);

        // This functions are defined here, because they need the collection and schema parameters
        return _.extend(this, {
            /**
             * Provides an edit click handler for use when clicked on the predefined "edit button"
             *
             * @method editClickHandler
             * @param {Node} target The target which has been clicked on
             * @for CRUDGenerator
             */
            editClickHandler : function (target) {
                var values = {},
                    tableRow = $(target).parent().parent(),
                    valid = this.checkValidityOfForm(tableRow),
                    currentState = $(target).attr('data-state');

                switch(currentState) {
                    case 'really-edit':
                        if (valid) {
                            values = this.getFormValues($(target).parent().parent(), schema);
                            Meteor.call(name + '_update', $(target).attr('data-id'), values);
                        }
                        break;
                    case 'editable' :
                        if (valid) {
                            $(target)
                                .text('Really edit?')
                                .attr('data-state', 'really-edit')
                                .addClass('gui-crud-really-edit');
                        }
                        break;
                    case 'not-editable':
                    default :
                        this.markupGenerator.generateEditForm($(target).parent().parent(), schema, this);
                        $(target).attr('data-state', 'editable');
                        break;
                }
            },
            /**
             * Provides a create click handler for use when clicked on the predefined "click button"
             *
             * @method createClickHandler
             * @param {Node} target The target which has been clicked on
             * @for CRUDGenerator
             */
            createClickHandler : function (target) {
                var values,
                    tableRow = $(target).parent().parent(),
                    valid = this.checkValidityOfForm(tableRow),
                    currentState = $(target).attr('data-state'),
                    table = $('.' + $(target).attr('data-table-class'));

                switch (currentState) {
                    case 'create-new-row' :
                        $(table).append(this.markupGenerator.generateEmptyCreateTableRow(schema));
                        this.markupGenerator.generateEditForm($(table).find('tr').last(), schema, this);
                        break;
                    case 'create-new-entry' :
                    default:
                        if (valid) {
                            values = this.getFormValues($(target).parent().parent(), schema);
                            Meteor.call(name + '_insert', values);
                        }
                        break;
                }
            },
            /**
             * Provides a delete click handler for use when clicked on the predefined "delete button"
             *
             * @method deleteClickHandler
             * @param {Node} target The target which has been clicked on
             * @for CRUDGenerator
             *
             */
            deleteClickHandler : function (target) {
                var currentState = $(target).attr('data-state');

                switch (currentState) {
                    case 'really-delete' :
                        Meteor.call(name + '_remove', $(target).attr('data-id'));
                        break;
                    case 'not-deletable' :
                    default :
                        $(target)
                            .text('Really delete?')
                            .attr('data-state', 'really-delete')
                            .addClass('gui-crud-really-delete');
                        break;
                }
            }
        });
    };

    CRUDGenerator.prototype = {
        /**
         * The current version of the CRUDGenerator
         *
         * @property version
         * @type {Number}
         */
        version : 0.8,
        /**
         * Little description about the CRUDGenerator
         *
         * @property description
         * @type {String}
         */
        description: 'This Object generates a CRUD for a specific Meteor.Collection based on a specified schema',
        /**
         * Used to check the html5 validity of a form
         *
         *
         * @param {Node} tableRow The tablerow which contains the input fields to be looped through
         */
        checkValidityOfForm : function (tableRow) {
            // TODO: Object or array?
            var validInputs = [];

            tableRow.find('input').each(function () {
                validInputs.push(this.checkValidity());

                if (!this.checkValidity()) {
                    throwMeteorError($(this).parent().attr('data-key') + ' doesn\'t contain valid data!');
                }
            });

            if (_.contains(validInputs, false)) {
                return false
            }

            return true;
        },
        /**
         * Used to change the value type to the correct one specified in the schema
         *
         * @method changeValueType
         * @param {String} value     Value of the input field (right now, is always a string)
         * @param {String} valueType Defined value type for the value (number, string etc.)
         *
         * @return {mixed}           Valid value with the right value
         */
        changeValueType : function (value, valueType) {
            var returnValue;

            switch (valueType) {
                case 'number' :
                    returnValue = parseInt(value, 10);
                    break;
                case 'date' :
                case 'datetime' :
                    returnValue = new Date(value);
                    break;
                case 'string' :
                default :
                    returnValue = value;
                    break;
            }

            return returnValue;
        },
        /**
         * Gets the form values out of the provided tableRow
         *
         * @method getFormValues
         * @param {Node} tableRow    The table row which contains the form values
         *
         * @return {object}          The object which will be used for a create / update operation
         */
        getFormValues : function (tableRow, schema) {
            var returnObj = {},
                that = this;

            _.each(schema, function (value, key) {
                var rawValue,
                    fieldDef = that.recognizeFieldDefinition(value);

                switch (fieldDef.contentType) {
                    case 'datetime':
                    case 'string':
                    case 'date':
                    case 'number':
                    default:
                        rawValue = tableRow.find(
                            'td[data-key="' + key + '"]:not(.crud-gui-button) input'
                        ).val();
                        returnObj[key] = that.changeValueType(rawValue, fieldDef.contentType);
                        break;
                }
            });

            return returnObj;
        },
        /**
         * Checks if the provided object is defined like written in the schema
         *
         * @method validCRUDObject
         * @param {Object} obj          The object to be analyzed
         * @param {Object} schema       The defined schema for the collection
         *
         * @return {boolean}            If the object is valid
         */
        validCRUDObject : function (obj, schema) {
            var that = this,
                returnVal = true,
                needsToBeAtLeast = this.getRequiredFields(schema);

            if (_.isString(obj._id)) {
                delete obj._id;
            }

            if (!_.isObject(obj)) {
                throwMeteorError('Value to be inserted / updated needs to be an Object!');
            }

            if (objectSize(obj) < objectSize(needsToBeAtLeast)) {
                throwMeteorError(
                    'Object to be inserted needs to be at least the same length as the schema definition!'
                );
            }

            _.each(obj, function (value, key) {
                if (!that.valueIsValid(schema[key], value)) {
                    returnVal = false;
                }
            });

            return returnVal;
        },
        /**
         *
         * Gets a fully defined and just returns a sub-schema with all required fields
         * e. g. all fields that start with a '_' are NOT required
         *
         * @param Object schema The normally defined schema
         * @returns {Object}
         */
        getRequiredFields : function (schema) {
            var requiredSchema = {};
            _.each(schema, function (field, key) {
                if ('_' != field.charAt(0)) {
                    requiredSchema[key] = field;
                }
            });

            return requiredSchema;
        },
        /**
         * Checks if a definition is required, isn't if starts with a '_'
         *
         * @param {String} definition
         * @returns {boolean}
         */
        isDefinitionRequired : function (definition) {
            var bool = true;

            if ('_' == definition.charAt(0)) {
                bool = false;
            }

            return bool;
        },
        /**
         * Returns an object of a field definition if it is valid
         *
         * @method recognizeFieldDefinition
         * @param {String} def       The definition of a field (e. g. string:12:email)
         *
         * @return {Object}          An associative array with all the field definitions
         */
        recognizeFieldDefinition : function (def) {
            var i,
                isRequired,
                returnObj = {},
                definitions = def.split(':'),
                contentTypes = ['string', 'date', 'datetime', 'number', 'object', 'array', 'boolean'];

            // If it's not required
            isRequired = this.isDefinitionRequired(def);
            if (!isRequired) {
                def = def.substr(1, def.length);
            }

            for (i = 0; definitions.length > i; i += 1) {
                switch (i) {
                    case 0:
                        if (!_.contains(contentTypes, definitions[0]) && isRequired) {
                            throwMeteorError('First definition of "' + def + '" has to be a valid content type!');
                        }
                        returnObj.contentType = definitions[0];
                        break;
                    case 1:
                        if (parseInt(definitions[1], 10) != definitions[1]) {
                            throwMeteorError(
                                'Second definition of "' + def + '" has to be a number (if no length = don\t specify any number)!'
                            );
                        }
                        returnObj.defLength = parseInt(definitions[1], 10);
                        break;
                    case 2:
                        returnObj.specialProp = definitions[2];
                        break;
                    case 3:
                    default:
                        throwMeteorError('Schema definitions can\'t have more than 3 defined properties, as in: "' + def + '"');
                        break;
                }
            }

            return returnObj;
        },
        /**
         * Checks if the values provided are the same as in the schema definition for it
         *
         * @method valueIsValid
         * @param {String} schemaDef    Schema definition string with all the "rules" for the value
         * @param {String} value        The value which wants to be checked (for an insert / update)
         *
         * @return {boolean}            Return true if the value is valid
         */
        valueIsValid : function (schemaDef, value) {
            var isRequired,
                definitionObj;

            if (_.isUndefined(schemaDef)) {
                return false;
            }

            // If it's not required, but still has been added
            isRequired = this.isDefinitionRequired(schemaDef);
            if (!isRequired) {
                schemaDef = schemaDef.substr(1, schemaDef.length);
            }

            definitionObj = this.recognizeFieldDefinition(schemaDef);

            // Check content type
            switch (definitionObj.contentType) {
                case 'date' :
                case 'datetime' :
                    if (!(value instanceof Date)) {
                        throwMeteorError('The value "' + value + '" doesn\'t match the defined content type: date');
                    }
                    break;
                default:
                case 'array' :
                case 'string' :
                case 'number' :
                case 'object' :
                case 'boolean' :
                    if (typeof value !== definitionObj.contentType) {
                        throwMeteorError(
                            'The value "' + value + '" doesn\'t match the defined content type: ' + definitionObj.contentType
                        );
                    }
                    break;
            }

            // Check length (2nd property)
            if (_.isUndefined(definitionObj.defLength) || definitionObj.defLength == -1) {
                return true;
            } else if (_.isObject(value) && objectSize(value) > definitionObj.defLength) {
                throwMeteorError ('The value "' + value.toString() + '" provided is too long!');
            } else if (value.length > definitionObj.defLength) {
                throwMeteorError(
                    'The value "' + value + '" is too long! (Required to be smaller than ' + definitionObj.defLength +' characters)'
                );
            }

            return true;
        }
    };

    if (Meteor === undefined) {
        throwMeteorError('Global Meteor Object doesn\' exist!');
    }

    // Make it global available
    Meteor.CRUDGenerator = CRUDGenerator;
}());