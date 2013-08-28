(function (window, document, undefined) {
    var CRUDMarkupGenerator;

    /**
     * Used for creating the whole markup for the crud table
     *
     * @class CRUDMarkupGenerator
     * @constructor
     */
    CRUDMarkupGenerator = function (options) {
        var options = options || {};

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

        generateHtml : function (type, value, defLength, that) {
            var string = '';

            switch (type) {
                case 'datetime':
                    string = '<div class="date-time-picker input-append date">'
                                  + '<input type="text" value="' + value + '" /> '
                                  + '<span class="add-on">'
                                      + '<i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>'
                                  +'</span>'
                              + '</div>';
                    $(that).html(string).datetimepicker({
                        format: 'MM/dd/yyyy hh:mm:ss',
                        language: 'en-US'
                    });
                    break;
                case 'date':
                case 'number':
                case 'string':
                default:
                    string = '<input'
                        + ' type="' + type
                        + '" value="' + this.escapeHtml(value)
                        + '" maxlength="' + this.escapeHtml(defLength)
                    + '" />';
                    $(that).html(string);
                    break;
            }

            return string;
        },
        /**
         * Generates the edit form for editing a mongo doc
         *
         * @method generateEditForm
         *
         * @return {String}
         */
        generateEditForm : function (tableRow, schema, crudGeneratorThis) {
            var that = this;

            tableRow.children(':not(.crud-gui-button)').each(function () {
                var inputType,
                    tdValue = $(this).text(),
                    dataKey = $(this).attr('data-key'),
                    fieldDefObj = crudGeneratorThis.recognizeFieldDefinition(schema[dataKey]);

                // Is this needed?
                switch (fieldDefObj.contentType) {
                    case 'datetime':
                        inputType = 'datetime';
                        break;
                    case 'date':
                        inputType = 'date';
                        break;
                    case 'number':
                        inputType = "number";
                        break;
                    default:
                    case 'string':
                        inputType = "text";
                        if (!_.isUndefined(fieldDefObj.specialProp)) {
                            inputType = fieldDefObj.specialProp;
                        }
                        break;
                }

                that.generateHtml(inputType, tdValue, fieldDefObj.defLength, this);
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
            return '<a href=#" data-state="create-new-entry" class="crud-gui-new-entry-button crud-gui-button crud-gui-create-button">Create new entry</a>';
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
        generateOverviewTable : function (collection, schema, name) {
            return new Handlebars.SafeString(
                '<form class="' + this.options.formClass + ' ' + this.options.additionalFormClasses + ' ">'
                    + '<table class="table ' + this.options.tableClass + ' ' + this.options.additionalTableClasses + ' crud-gui-' + name + '">'
                    + '<thead>' + this.generateTableHeaders(schema) + '</thead>'
                    + '<tbody>' + this.generateTableContent(collection, schema) + '</tbody>'
                    + '</table>' + this.generateCreateButton(name)) +
                '</form>';
        }
    }

    if (undefined === Meteor) {
        throw new Meteor.Error('Global Meteor Object doesn\' exist!');
    }

    // Make it globally available
    Meteor.CRUDMarkupGenerator = CRUDMarkupGenerator;

    $('form').submit(function (e) {
        e.preventDefault();
    });
}(window, document));