(function () {
    // @see https://github.com/matteodem/meteor-crud-generator/wiki/New-possible-features

    var callback,
        TypeFactory,
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
        },
        // Easier creation of a type
        createType = function (type, customFunctions) {
            var standardType = {
                parseValueOfType : function (value) {
                    return value.toString();
                },
                getHtmlFormValue : function (tr, key) {
                    return this.parseValueOfType(tr.find(
                        'td[data-key="' + key + '"]:not(.crud-gui-button) input'
                    ).val());
                },
                generateInputField : function (defObj, value, td, that) {
                    var type,
                        additionalAttributes = '';

                    if ("string" == defObj.contentType) {
                        type = "text";
                    } else if (!_.isUndefined(defObj.specialProp)) {
                        type = defObj.specialProp;
                    }

                    if (typeof defObj.defLength == "number") {
                        additionalAttributes = '" maxlength="' + that.escapeHtml(defObj.defLength);
                    }

                    $(td).html('<input'
                        + ' type="' + type
                        + '" value="' + that.escapeHtml(value)
                        + additionalAttributes
                        + '" />');
                },
                checkType : function (value) {
                    if (typeof value !== type) {
                        throwMeteorError(
                            'The value "' + value + '" doesn\'t match the defined content type: ' + type
                        );
                    }
                }
            };

            return _.extend(standardType, customFunctions);
        };

    TypeFactory = function (additionalTypes) {
        // TODO: Implement foreach through additionalTypes and some kind of interface
    }

    TypeFactory.prototype = {
        'get' : function (type) {
            if (!_.isObject(this[type])) {
                throwMeteorError("The type " + type + ' doesn\'t exist!');
            }

            return this[type];
        },
        'getAllTypes' : function () {
            var type,
                returnArray = [];

            for (type in this) {
                if ("function" !== typeof TypeFactory.prototype[type])
                returnArray.push(type);
            }

            return returnArray;
        },
        'array'   : createType('array'),
        'string'  : createType('string'),
        'object'  : createType('object'),
        'boolean' : createType('boolean'),
        'date'    : createType('date', {
            parseValueOfType : function (value) {
                return new Date(value);
            },
            checkType : function (value) {
                if (!(value instanceof Date)) {
                    throwMeteorError('The value "' + value + '" doesn\'t match the defined content type: date');
                }
            }
        }),
        'number' : createType('number', {
            parseValueOfType : function (value) {
                return parseInt(value, 10);
            },
            checkType : function (value) {
                if (!("number" == typeof value)) {
                    throwMeteorError('The value "' + value + '" doesn\'t match the defined content type: number');
                }
            }
        }),
        'datetime' : createType('datetime', {
            parseValueOfType : function (value) {
                return new Date(value);
            },
            checkType : function (value) {
                if (!(value instanceof Date)) {
                    throwMeteorError('The value "' + value + '" doesn\'t match the defined content type: date');
                }
            },
            generateInputField : function (defObj, value, td, that) {
                var string = '<div class="date-time-picker input-append date">'
                    + '<input type="text" value="' + that.escapeHtml(value) + '" /> '
                    + '<span class="add-on">'
                    + '<i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>'
                    +'</span>'
                    + '</div>';

                $(td).html(string).datetimepicker({
                    format: 'MM/dd/yyyy hh:mm:ss',
                    language: 'en-US'
                });
            }
        }),
        'file' : createType('file',  {
            generateInputField : function (defObj, value, td , that) {
                if (!_.isObject(filepicker)) {
                    throwMeteorError('You need to use filepicker.io to have the \'file\' type work (e.g meteor-package: loadpicker)');
                }

                $(td).html('<button class="crud-gui-file-upload">Upload File</button><input type="hidden" val="" />');
            },
            checkType : function (value) {
                var urlRegEx = new RegExp(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/);

                if  (0 === value.length) {
                    throwMeteorError('Please choose a file!');
                } else if (!urlRegEx.test(value)) {
                    throwMeteorError('The value "' + value + '" doesn\'t match the defined content type: file (needs to be a url)');
                }
            }
        })
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
        this.typeFactory = new TypeFactory(options.additionalTypes);

        if (Meteor.isClient) {
            this.markupGenerator = new Meteor.CRUDMarkupGenerator(collection, schema, options.markup, this);

            Template.__define__(name + '_crud', function () {
                return that.markupGenerator.generateOverviewTable(name);
            });

            Template[name + '_crud'].events({
                'submit .crud-gui-form' : function (e) {
                    e.preventDefault();
                },
                'click .crud-gui-file-upload' : function (e) {
                    filepicker.pick(function (InkBlob) {
                        $(e.target).next().val(InkBlob.url);
                    });

                    e.preventDefault();
                },
                'click .crud-gui-delete-button' : function (e) {
                    that.markupGenerator.deleteClickHandler(e.target, that.collectionName);
                },
                'click .crud-gui-edit-button' : function (e) {
                    that.markupGenerator.editClickHandler(e.target, that.collectionName);
                },
                'click .crud-gui-create-button' : function (e) {
                    that.markupGenerator.createClickHandler(e.target, that.collectionName);
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
    };

    CRUDGenerator.prototype = {
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
            return this.typeFactory
                .get(valueType)
                .parseValueOfType(value);
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
                contentTypes = this.typeFactory.getAllTypes();

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
            this.typeFactory
                .get(definitionObj.contentType)
                .checkType(value);

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