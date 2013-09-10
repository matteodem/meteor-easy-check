(function (window, document, undefined) {
    var CRUDMarkupGenerator;

    /**
     * Used for creating the whole markup for the crud table
     *
     * @class CRUDMarkupGenerator
     * @constructor
     */
    CRUDMarkupGenerator = function (collection, schema, options, parent) {
        var options = options || {};

        this.fnParent = parent;
        this.schema = schema;
        this.collection = collection;

        options.formClass = '';
        options.tableClass = '';
        options.additionalFormClasses = options.additionalFormClasses || '';
        options.additionalTableClasses = options.additionalTableClasses || '';

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
            var that = this;

            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return that.htmlEntityMap[s];
            });
        },
        /**
         * Used to check the html5 validity of a form
         *
         *
         * @param {XML|jQuery} tableRow The tablerow which contains the input fields to be looped through
         */
        checkValidityOfForm : function (tableRow) {
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
                var fieldDef = that.fnParent.recognizeFieldDefinition(value);

                returnObj[key] = that.fnParent.typeFactory
                    .get(fieldDef.contentType)
                    .getHtmlFormValue(tableRow, key);
            });

            return returnObj;
        },
        /**
         * Provides an edit click handler for use when clicked on the predefined "edit button"
         *
         * @method editClickHandler
         * @param {Node} target The target which has been clicked on
         * @param {String} the name of the collection to be edited
         * @for CRUDGenerator
         */
        editClickHandler : function (target, name) {
            var values = {},
                tableRow = $(target).parent().parent(),
                valid = this.checkValidityOfForm(tableRow),
                currentState = $(target).attr('data-state');

            switch(currentState) {
                case 'really-edit':
                    if (valid) {
                        values = this.getFormValues($(target).parent().parent(), this.schema);
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
                    this.generateEditForm($(target).parent().parent());
                    $(target).attr('data-state', 'editable');
                    break;
            }
        },
        /**
         * Provides a create click handler for use when clicked on the predefined "click button"
         *
         * @method createClickHandler
         * @param {Node} target The target which has been clicked on
         * @param {String} the name of the collection to be edited
         * @for CRUDGenerator
         */
        createClickHandler : function (target, name) {
            var values,
                tableRow = $(target).parent().parent(),
                valid = this.checkValidityOfForm(tableRow),
                currentState = $(target).attr('data-state'),
                table = $('.' + $(target).attr('data-table-class'));

            switch (currentState) {
                case 'create-new-row' :
                    $(table).append(this.generateEmptyCreateTableRow());
                    this.generateEditForm($(table).find('tr').last());
                    break;
                case 'create-new-entry' :
                default:
                    if (valid) {
                        values = this.getFormValues($(target).parent().parent(), this.schema);
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
         * @param {String} the name of the collection to be edited
         * @for CRUDGenerator
         *
         */
        deleteClickHandler : function (target, name) {
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
        },
        /**
         * Generates the html for the table header
         *
         * @method generateTableHeaders
         *
         * @return {String}
         */
        generateTableHeaders : function () {
            var that = this,
                markup = '<tr>';
            _.each(this.schema, function (value, key) {
                markup += "<th class='crud-gui-th" + this.name + "'>" + that.escapeHtml(key + ' (' + value + ')') + "</th>";
            });

            _.each(this.options.additionalRows, function (obj) {
                markup += '<th class="crud-gui-th custom-row">' + obj.header + '</th>';
            });

            markup += '<th class="crud-gui-th edit-header">Edit entry</th>';
            markup += '<th class="crud-gui-th delete-header">Delete entry</th>';
            markup += "</tr>";

            return markup;
        },
        generateCustomRows : function (schema, document) {
            var customMarkup = '';

            _.each(this.options.additionalRows, function (obj) {
                var actualValue = '',
                    val = obj.content;

                if ("function" == typeof val) {
                    actualValue = val(schema, document);
                } else if ("string" == typeof val) {
                    actualValue = val;
                } else {
                    actualValue = val.toString();
                }

                customMarkup += '<td class="crud-gui-td crud-gui-edit crud-gui-not-editable">' + actualValue + '</td>';
            });

            return customMarkup;
        },
        /**
         * Generates the html for the whole table content. In this case all
         * the mongo docs in the collection, based on the defined schema
         *
         * @method generateTableContent
         *
         * @return {String}
         */
        generateTableContent : function () {
            var that = this,
                markup = '';

            this.collection.find().forEach(function (doc) {
                markup += "<tr>";
                _.each(that.schema, function (value, key) {
                    var fieldDefObj = that.fnParent.recognizeFieldDefinition(value);

                    markup += '<td class="crud-gui-td" data-key=' + key
                        + ' data-schema="' + that.schema[key] + '">'
                        + that
                            .fnParent
                            .typeFactory
                            .get(fieldDefObj.contentType)
                            .getDisplayHtml(doc[key], that)
                        + '</td>';
                });

                markup += that.generateCustomRows(that.schema, doc);

                markup += '<td class="crud-gui-td crud-gui-edit crud-gui-not-editable">' + that.generateEditButton(doc) + '</td>';
                markup += '<td class="crud-gui-td crud-gui-delete crud-gui-not-editable">' + that.generateDeleteButton(doc) + '</td>';

                markup += "</tr>";
            });

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
        generateEmptyCreateTableRow : function () {
            var that = this,
                markup = '<tr>';

            _.each(that.schema, function (value, key) {
                markup += '<td class="crud-gui-td" data-key=' + key + ' data-schema="' + that.schema[key] + '"></td>';
            });

            _.each(this.options.additionalRows, function (obj) {
                markup += '<td class="crud-gui-td custom-row crud-gui-not-editable"></td>';
            });

            markup += '<td class="crud-gui-td crud-gui-create crud-gui-not-editable">' + that.generateNewEntryButton() + '</td>';
            markup += '<td class="crud-gui-not-editable"></td>';
            markup += "</tr>";

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

            tableRow.children(':not(.crud-gui-not-editable)').each(function () {
                var tdValue = $(this).text(),
                    dataKey = $(this).attr('data-key'),
                    fieldDefObj = that.fnParent.recognizeFieldDefinition(that.schema[dataKey]);

                that.fnParent.typeFactory
                    .get(fieldDefObj.contentType)
                    .generateInputField(fieldDefObj, tdValue, this, that);
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
            return '<a href=#" data-state="create-new-entry" class="crud-gui-new-entry-button crud-gui-not-editable crud-gui-create-button">Create new entry</a>';
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
        },
        /**
         * Generates the html for the whole CRUD table
         *
         * @method generateOverviewTable
         * @for CRUDGenerator
         *
         * @return String The html string
         */
        generateOverviewTable : function (name) {
            return new Handlebars.SafeString(
                '<form class="crud-gui-form ' + this.options.formClass + ' ' + this.options.additionalFormClasses + ' ">'
                    + '<table class="table ' + this.options.tableClass + ' ' + this.options.additionalTableClasses + ' crud-gui-' + name + '">'
                    + '<thead>' + this.generateTableHeaders() + '</thead>'
                    + '<tbody>' + this.generateTableContent() + '</tbody>'
                    + '</table>' + this.generateCreateButton(name)) +
                '</form>';
        }
    }

    if (undefined === Meteor) {
        throw new Meteor.Error('Global Meteor Object doesn\' exist!');
    }

    // Make it globally available
    Meteor.CRUDMarkupGenerator = CRUDMarkupGenerator;
}(window, document));