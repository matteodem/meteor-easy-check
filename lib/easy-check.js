EasyCheck = function () {
    'use strict';

    var Helpers = {},
        factory = new TypeFactory(),
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

    /**
     * All the predefined types.
     *
     * @type object The predefined objects
     */
    TypeFactory.prototype.types = {
        'date' : {
            'check' : function (value) {
                return value instanceof Date;
            }
        }
    };

    /**
     * Adds a custom defined type to the TypeFactory.
     *
     * @param key The key, such as "datetime"
     * @param type The type object with the required functions
     */
    TypeFactory.prototype.addType = function (key, type) {
        if ("object" === typeof type && "string" === typeof key) {
            this.types[key] = type;
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
        return factory.get(type).check(value);
    }

    /**
     * (Private) Check the configured minLength against the value that shall be checked
     *
     * @param value             The value, should be a string
     * @param declaredLength    The minLength for the value
     * @returns {boolean}
     */
    function checkMinLength(value, declaredLength) {
        var length = parseInt(declaredLength, 10);

        if ("number" !== typeof length || isNaN(length)) {
            return true;
        }

        return value.length >= length;
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
            var value = object[key],
                fieldConfig = config[key];

            if (typeof fieldConfig == "undefined") {
                return false;
            }

            if (fieldConfig.type instanceof EasyCheck) {
                return fieldConfig.type.check(value, fieldConfig.type._config);
            }

            if (!isValidType(fieldConfig.type, value)) {
                return false;
            }

            if (!checkMinLength(value, fieldConfig.minLength)) {
                return false;
            }

            if (fieldConfig.regex instanceof RegExp && !fieldConfig.regex.test(value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Returns a field config object, based on what has been given in as a parameter.
     *
     * Should look like:
     * {
     *     type : 'string',
     *     maxLength : 100,
     *     minLength : 5,
     *     regex : /[a-Z]+/g
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

        if (conf instanceof EasyCheck) {
            fieldConf.type = conf;
            return fieldConf;
        }

        if (typeof conf === "string") {
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
        } else if (typeof conf === 'object') {
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

        that.check = function (obj, config) {
            var conf = config || that._config;

            return isValid(obj, conf);
        };
        
        that.factory = factory;

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