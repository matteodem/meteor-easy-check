(function (undefined) {
    // TODO: Decent Testing
    // TODO: Check why it sets values even if there are errors
    // TODO: Implement 3rd property
    // TODO: If defined, add pure-form css and make custom css classes possible

    var CRUDGenerator,
        CRUDMarkupGenerator,
        // Checks the user rights with provided array users
        checkUserRights = function (users) {
            var currentUser = Meteor.user();

            if ("undefined" === typeof users) {
                // Everyone is privileged
                return true;
            }

            if (!_.contains(users, currentUser.username)) {
                throw new Error("You are not privileged to execute this CRUD operation!");
            }

            return true;
        },
        // Returns the size of an object (withouth methods)
        objectSize = function(obj) {
            var size = 0, key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) size++;
            }
            return size;
        };

    /**
     * Used for creating the whole markup for the crud table
     *
     * @class CRUDMarkupGenerator
     * @constructor
     */
    CRUDMarkupGenerator = function (options) {
        if (_.isUndefined(options)) {
            options = {};
        }

        this.options = options;
    };

    CRUDMarkupGenerator.prototype = {
        /**
         * The Entity Map used to escape Html Strings
         *
         * @property htmlEntityMap
         * @type object
         */
        htmlEntityMap : {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': '&quot;',
            "'": '&#39;',
            "/": '&#x2F;'
        },
        /**
         * Creates an html / xss safe html string
         *
         * @method escapeHtml
         *
         * @return {String}
         */
        escapeHtml : function (string) {
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                  return htmlEntityMap[s];
            });
        },
        /**
         * Generates the html for the table header
         *
         * @method generateTableHeaders
         *
         * @return {String}
         */
        generateTableHeaders : function (schema) {
            var that = this,
                markup = '<tr>';
            _.each(schema, function (value, key) {
                markup += "<th class='crud-gui-th" + this.name + "'>" + that.escapeHtml(key + ' (' + value + ')') + "</th>";
            });

            markup += '<th class="crud-gui-th edit-header">Edit entry</th>';
            markup += '<th class="crud-gui-th delete-header">Delete entry</th>';
            markup += "</tr>";

            return markup;
        },
        /**
         * Generates the html for an empty table row
         * (used when creating a new entry)
         *
         * @method generateEmptyCreateTableRow
         *
         * @return {String}
         */
        generateEmptyCreateTableRow : function (schema) {
            var that = this,
                markup = '<tr>';

            _.each(schema, function (value, key) {
                markup += '<td class="crud-gui-td" data-key=' + key + ' data-schema="' + schema[key] + '"></td>';
            });

            markup += '<td class="crud-gui-td crud-gui-create crud-gui-button">' + that.generateNewEntryButton() + '</td>';
            markup += '<td class="crud-gui-button"></td>';
            markup += "</tr>";


            return markup;
        },
        /**
         * Generates the html for the whole table content. In this case all
         * the mongo docs in the collection, based on the defined schema
         *
         * @method generateTableContent
         *
         * @return {String}
         */
        generateTableContent : function (collection, schema) {
            var that = this,
                markup = '';

            collection.find().forEach(function (doc) {
                markup += "<tr>";
                _.each(schema, function (value, key) {
                    markup += '<td class="crud-gui-td" data-key=' + key 
                        + ' data-schema="' + schema[key] + '">' + that.escapeHtml(doc[key]) + '</td>';
                });

                markup += '<td class="crud-gui-td crud-gui-edit crud-gui-button">' + that.generateEditButton(doc) + '</td>';
                markup += '<td class="crud-gui-td crud-gui-delete crud-gui-button">' + that.generateDeleteButton(doc) + '</td>';
                markup += "</tr>";
            });

            return markup;
        },
        /**
         * Generates the edit form for editing a mongo doc
         *
         * @method generateEditForm
         *
         * @return {String}
         */
        generateEditForm : function (tableRow) {
            var that = this;

            tableRow.children(':not(.crud-gui-button)').each(function () {
                var tdValue = $(this).text();
                // TODO: Don't always set to text, also mail and everything that is defined as 3rd property!
                $(this).html('<input type="text" value="' + that.escapeHtml(tdValue) +'" />');
            });
        },
        /**
         * Generates the html for the "Create new entry" button 
         * in the table row
         *
         * @method generateNewEntryButton
         *
         * @return {String}
         */
        generateNewEntryButton : function () {
            return '<a href=#" data-state="create-new-entry" class="crud-gui-new-entry-button crud-gui-create-button">Create new entry</a>';
        },
        /**
         * Generates the html for the "Create new X" button 
         * not in the table
         *
         * @method generateCreateButton
         *
         * @return {String}
         */
        
        generateCreateButton  : function (name) {
            return '<a class="crud-gui-create-button"' +
                       'data-state="create-new-row"' +
                       'data-table-class="crud-gui-'+ name +
                       '" href="#">Create new ' + name.substr(0, name.length - 1) + '</a>';
        },
        /**
         * Generates the html for the "edit" button in the table
         * for existing mongo docs
         *
         * @method generateEditButton
         *
         * @return {String}
         */
        generateEditButton : function (doc) {
            if (_.isString(this.options['edit-button-markup'])) {
                return this.options['edit-button-markup'];
            }

            return '<a class="crud-gui-edit-button" data-state="not-editable" data-id=' + doc._id +' href="#">edit</a>';
        },
        /**
         * Generates the html for the "delete" button in the table
         * for existing mongo docs
         *
         * @method generateDeleteButton
         *
         * @return {String}
         */
        generateDeleteButton : function (doc) {
            if (_.isString(this.options['delete-button-markup'])) {
                return this.options['delete-button-markup'];
            }

            return '<a class="crud-gui-delete-button" data-state="not-deletable" data-id=' + doc._id +' href="#">delete</a>';
        }
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
     * @return CRUDGenerator
     */
    CRUDGenerator = function (collection, schema, options) {
        var that = this,
            crudFunctions = {},
            name = collection._name,
            generatorOptions = options;

        this.schema = schema;
        this.options = options;
        this.markupGenerator = new CRUDMarkupGenerator(options.markup);

        if ("undefined" == typeof generatorOptions) {
            generatorOptions = {};
        }

        // Create safe CRUD methods
        crudFunctions[name + '_insert'] = function (obj, callback) {
            checkUserRights(generatorOptions.users);

            if (that.validCRUDObject(obj, schema)) {
                return collection.insert(obj, callback);
            }
        },
        crudFunctions[name + '_update'] = function (selector, modifier, options, callback) {
            var newDoc,
                oldDocs = collection.find(selector).fetch();

            checkUserRights(generatorOptions.users);

            collection.update(selector, modifier, options, callback);

            _.each(oldDocs, function (oldDoc) {
                newDoc = collection.findOne(oldDoc._id);

                if (!that.validCRUDObject(newDoc, schema)) {
                    collection.update(oldDoc._id, oldDoc);
                    throw new Error("Update Operation reverted, the new document doesn't match the schema definition!");
                }
            });
        },
        crudFunctions[name + '_remove'] = function (id) {
            collection.remove(id);
        };

        Meteor.methods(crudFunctions);
        // This functions are defined here, because they need the collection and schema parameters
        return _.extend(this, {
            /**
             * Generates the html for the whole CRUD table
             * 
             * @method generateOverviewTable
             * @for CRUDGenerator
             *
             * @return {Handlebars.SafeString} The html string
             */
            generateOverviewTable : function () {
                return new Handlebars.SafeString('<table class="crud-gui-' + name + '">'
                        + that.markupGenerator.generateTableHeaders(schema)
                        + that.markupGenerator.generateTableContent(collection, schema) +
                    '</table>' + that.markupGenerator.generateCreateButton(name));
            },
            /**
             * Provides an edit click handler for use when clicked on the predefined "edit button"
             * 
             * @method editClickHandler
             * @param {Node} target The target which has been clicked on
             * @for CRUDGenerator
             */
            editClickHandler : function (target) {
                var values = {},
                    currentState = $(target).attr('data-state');

                switch(currentState) {
                    case 'really-edit':
                        values = this.getFormValues($(target).parent().parent());
                        Meteor.call(name + '_update', $(target).attr('data-id'), values);
                        break;
                    case 'editable' :
                        $(target)
                            .text('Really edit?')
                            .attr('data-state', 'really-edit')
                            .addClass('gui-crud-really-edit');
                        break;
                    case 'not-editable':
                    default :
                        this.markupGenerator.generateEditForm($(target).parent().parent());
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
                    currentState = $(target).attr('data-state'),
                    table = $('.' + $(target).attr('data-table-class'));

                switch (currentState) {
                    case 'create-new-row' :
                        $(table).append(this.markupGenerator.generateEmptyCreateTableRow(schema));
                        this.markupGenerator.generateEditForm($(table).find('tr').last());
                        break;
                    case 'create-new-entry' :
                    default:
                        values = this.getFormValues($(target).parent().parent());
                        Meteor.call(name + '_insert', values);
                        break;
                }
            },
            /**
             * Provides a delete click handler for use when clicked on the predefined "delete button"
             * 
             * @method deleteClickHandler
             * @param {Node} target The target which has been clicked on
             * @for CRUDGenerator
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
        version : 1.0,
        /**
         * Little description about the CRUDGenerator
         *
         * @property description
         * @type {String}
         */
        description: 'This Object generates a CRUD for a specific Meteor.Collection based on a specified schema',
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
        getFormValues : function (tableRow) {
            var returnObj = {},
                that = this;

            tableRow.children(':not(.crud-gui-button)').each(function () {
                var formValue = that.changeValueType(
                                    $(this).children('input').val(),
                                    $(this).attr('data-schema').split(':').shift());

                returnObj[$(this).attr('data-key')] = formValue;
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
                returnVal = true;

            if (_.isString(obj._id)) {
                delete obj._id;
            }

            if (!_.isObject(obj)) {
                throw new Error('Value to be inserted / updated needs to be an Object!');
            }

            if (objectSize(obj) !== objectSize(schema)) {
                throw new Error('Object to be inserted needs to have the same length as the schema definition!');
            }

            _.each(obj, function (value, key) {
                if (!that.valueIsValid(schema[key], value)) {
                    returnVal = false;
                }
            });

            return returnVal;
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
                returnObj = {},
                definitions = def.split(':'),
                contentTypes = ['anything', 'string', 'number', 'object'];

            for (i = 0; definitions.length > i; i += 1) {
                switch (i) {
                    case 0:
                        if (!_.contains(contentTypes, definitions[0])) {
                            throw new Error('First definition of "' + def + '" has to be a valid content type!');
                        }
                        returnObj.contentType = definitions[0];
                        break;
                    case 1:
                        if (parseInt(definitions[1], 10) != definitions[1]) {
                            throw new Error('Second definition of "' + def + '" has to be a number (no length = -1)!');
                        }
                        returnObj.defLength = parseInt(definitions[1], 10);
                        break;
                    case 2:
                        returnObj.specialProp = definitions[2];
                        break;
                    case 3:
                    default:
                        throw new Error('Schema definitions can\'t have more than 3 defined properties, as in: "' + def + '"');
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
            var definitionObj;

            if (_.isUndefined(schemaDef)) {
                return false;
            }

            definitionObj = this.recognizeFieldDefinition(schemaDef);

            if (typeof value !== definitionObj.contentType) {
                throw new Error('The value "' + value + '" doesn\'t match the defined content type: ' + definitionObj.contentType);
            } else if (_.isUndefined(definitionObj.defLength)) {
                return true;
            } else if (value.length > definitionObj.defLength) {
                throw new Error('The value "' + value + '" is too long! (Required to be smaller than ' + definitionObj.defLength +' characters)');
            }

            return true;
        }
    };

    if (Meteor === undefined) {
        throw new Meteor.Error('Global Meteor Object doesn\' exist!');
    }

    // Make it global available
    Meteor.CRUDGenerator = CRUDGenerator;
}());