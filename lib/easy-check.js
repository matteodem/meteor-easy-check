EasyCheck = function () {
    'use strict';

    var Helpers = {},
        defaultOptions = {
            'onInsert' : function () {
                    return true;
                },
            'onUpdate' : function () {
                return true;
            },
            'onRemove' : function () {
                return true;
            },
            'OnCheckUpdatedDoc' : function () {
                return true;
            }
        };

    /**
     * A TypeFactory to add the possibility for extending / defining own types.
     *
     * @constructor
     * @class TypeFactory
     */
    function TypeFactory() {}

    TypeFactory.prototype.types = {
        'date' : {
            'check' : function (value) {
                return value instanceof Date;
            }
        }
    };

    /**
     * Get a type of the TypeFactory.
     *
     * @param type String key for the type
     * @returns object
     */
    TypeFactory.prototype.get = function (type) {
        var typeFunc = this.types[type];

        if ("function" == typeof typeFunc) {
            return typeFunc;
        }

        // Standard type such as "string", "boolean", "number" etc
        return {
            'check' : function (value) {
                return typeof value === type;
            }
        };
    };

    /**
     * Add default functions to the options that have been passed.
     *
     * @param options The provided options
     * @returns object
     */
    function getOptions(options) {
        var cloneDefOptions = _.clone(defaultOptions);

        options = options || {};

        return _.extend(cloneDefOptions, options);
    }

    /**
     * (Private) Get the size, length of an object.
     *
     * @param obj
     * @returns number
     */
    function objectSize(obj) {
        var key,
            size = 0;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                size += 1;
            }
        }
        return size;
    };

    /**
     * (Private) Returns true if the value is valid.
     *
     * @param type  The type which should be checked on
     * @param value The value to be checked for
     */
    function isValidType(type, value) {
        var factory = new TypeFactory();

        return factory.get(type).check(value);
    }

    /**
     * (Private) Returns a boolean when the object which is to be checked is valid.
     *
     * @param object    An object which wants to get checked
     * @param config    The config which was specified
     * @return boolean
     */
    function isValid(object, config) {
        var key,
            returnValue = true,
            sizeOfRequiredValues = 0;

        for (key in config) if (config.hasOwnProperty(key)) {
            if (config[key].required !== false) {
                sizeOfRequiredValues += 1;
            }
        }

        if (objectSize(object) < sizeOfRequiredValues || objectSize(object) > objectSize(config)) {
            return false;
        }

        for (key in object) if (object.hasOwnProperty(key)) {
            if (typeof config[key] == "undefined") {
                return false;
            } else if (!isValidType(config[key].type, object[key])) {
                returnValue = false;
            }
        }

        return returnValue;
    }

    /**
     * Returns a field config object, based on what has been given in as a parameter.
     *
     * Should look like:
     * {
     *     type : 'string',
     *     maxLength : 100,
     *     required : true
     * }
     *
     * @param conf A definition for the field
     */
    Helpers.getFieldConfig = function (conf) {
        var i,
            stringArray,
            fieldConf = {
                type : 'string',
                maxLength : -1,
                required : true
            };

        if (typeof conf == "string") {
            stringArray = conf.split(':');

            for (i = 0; i < stringArray.length; i += 1) {
                // Fill in properties based on the order
                switch (i) {
                    case 0:
                        fieldConf.type = stringArray[0];
                        break;
                    case 1:
                        if (stringArray[1] > 0) {
                            fieldConf.maxLength = parseInt(stringArray[1], 10);
                        }
                        break;
                    case 2:
                        fieldConf.required = 'false' == stringArray[2] ? false : 'true' == stringArray[2];
                }
            }
        } else if (typeof conf == 'object') {
            fieldConf = _.extend(fieldConf, conf);
        }

        return fieldConf
    };

    /**
     * Returns a globally useable / recognized easy-config object.
     *
     * @param conf  The config which has to be extracted
     * @returns object
     */
    Helpers.getEasyConfig = function (conf) {
        var key,
            easyConf = {};

        for (key in conf) if (conf.hasOwnProperty(key)) {
            easyConf[key] = Helpers.getFieldConfig(conf[key]);
        }

        return easyConf;
    };

    /**
     * The global constructor.
     *
     * @class EasyCheck
     * @param config The config for the easy-check
     * @param collection A Meteor.Collection to add helper methods to
     * @param options Additional options
     */
    return function (config, collection, options) {
        var name,
            meteorMethods,
            that = this;

        config = config || false;
        collection = collection || false;
        options = getOptions(options);

        if (!config) {
            throw new Error("Provide a config!");
        }

        that._config = Helpers.getEasyConfig(config);

        that._helpers = Helpers;

        that.check = function (obj) {
            return isValid(obj, this._config);
        };

        if (collection instanceof Meteor.Collection) {
            name = collection._name;
            meteorMethods = {};

            meteorMethods[name + '_insert'] = function (doc, callback) {
                if (that.check(doc) && options.onInsert(doc)) {
                    collection.insert(doc, callback);
                }
            };

            meteorMethods[name + '_update'] = function (selector, modifier, options) {
                var newDoc,
                    oldDocs = collection.find(selector).fetch();

                if (options.onUpdate(selector, modifier, options)) {
                    collection.update.apply(this, arguments);
                }


                _.each(oldDocs, function (oldDoc) {
                    newDoc = collection.findOne(oldDoc._id);

                    if (!that.check(newDoc) && !options.onCheckUpdatedDoc(newDoc)) {
                        collection.update(oldDoc._id, oldDoc);
                        console.log("Update Operation reverted on " + oldDoc._id + ", isn\t valid!");
                    }
                });
            };

            meteorMethods[name + '_remove'] = function (id, callback) {
                if (options.onRemove(id)) {
                    collection.remove(id, callback);
                }
            };

            Meteor.methods(meteorMethods);

            collection.easyInsert = function (doc, callback) {
                if (!that.check(doc)) {
                    return false;
                }

                Meteor.apply(name + '_insert', arguments);
            };

            collection.easyUpdate = function () {
                Meteor.apply(name + '_update', arguments);
            };

            collection.easyRemove = function () {
                Meteor.apply(name + '_remove', arguments);
            };
        }

        return that;
    };
}();