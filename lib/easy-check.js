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
            'onCheckUpdatedDoc' : function () {
                return true;
            },
            'onError' : function(errors) {}
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
        },
        'array' : {
            'check' : function (value) {
                return _.isArray(value);
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
        var realType = this.types[type];

        if ("object" == typeof realType) {
            return realType;
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
     * (Private) Check the configured minLength against the value that shall be checked.
     *
     * @param value             The value, should be a string
     * @param config            The config for the value
     * @returns {boolean}
     */
    function checkLength(value, config) {
        var minLength = config.minLength || 0,
            maxLength = config.maxLength || -1,
            isLongEnough = value.length >= minLength,
            isShortEnough = maxLength !== -1 ? maxLength >= value.length : true;

        return isLongEnough && isShortEnough;
    }

    /**
     * (Private) Check the "contains" property on the array given.
     * @param array             The array to be checked against
     * @param shouldContain     The type of values it shall contain
     * @returns {boolean}
     */
    function checkArrayValues(array, shouldContain) {
        var i,
            returnValue = true;

        for (i = 0; i < array.length; i += 1) {
            if (!isValidType(shouldContain, array[i])) {
                returnValue = false;
            }
        }

        return returnValue;
    }

    /**
     * (Private) Check the "contains" property on the array given.
     * @param value             The value which is referenced
     * @param referenceObj      The object with information about the reference
     * @returns {boolean}
     */
    function checkReference(value, referenceObj) {
        var i,
            selector = {},
            returnValue = true;


        referenceObj.field = referenceObj.field || '_id';

        if (referenceObj.field) {
            selector = {};
            selector[referenceObj.field] = value;
        }

        if (!_.isArray(value)) {
            if (!referenceObj.collection.findOne(selector)) {
                returnValue = false;
            }
        } else {
            for (i = 0; i < value.length; i += 1) {
                selector[referenceObj.field] = value[i];
                if (!referenceObj.collection.findOne(selector)) {
                    returnValue = false;
                }
            }
        }

        return returnValue;
    }

    /**
     * Check if a required value is missing
     *
     * @param value
     */
    function requiredValueValid(value) {
       if (_.isObject(value)) {
           return objectSize(value) > 0;
       } else if (_.isArray(value) || "string" === typeof value) {
           return value.length > 0;
       } else {
           return "undefined" !== typeof value;
       }
    }

    /**
     * (Private) Returns a boolean when the object which is to be checked is valid.
     *
     * @param object    An object which wants to get checked
     * @param config    The config which was specified
     * @return boolean
     */
    function isValid(object, config, options) {
        var key,
            errors = [],
            sizeOfRequiredValues = 0,
            requiredValueMissing = false;

        for (key in config) if (config.hasOwnProperty(key)) {
            if (config[key].required !== false) {
                if (!requiredValueValid(object[key])) {
                    requiredValueMissing = true;
                }

                sizeOfRequiredValues += 1;
            }
        }

        if (requiredValueMissing) {
            errors.push({
                'type' : 'required',
                'field' : '',
                'value' : '',
                'defaultMessage' : 'There are required values missing'
            });
        }

        if (objectSize(object) < sizeOfRequiredValues || objectSize(object) > objectSize(config)) {
            errors.push({
                'type' : 'general',
                'field' : '',
                'value' : '',
                'defaultMessage' : 'The size of the values in the provided document are invalid'
            });
        }

        for (key in object) if (object.hasOwnProperty(key)) {
            var execArray,
                execValue = '',
                value = object[key],
                fieldConfig = config[key];

            if (typeof fieldConfig === "undefined") {
                errors.push({
                    'type' : fieldConfig,
                    'field' : key,
                    'value' : value,
                    'defaultMessage' : 'The value "' + value + '" provided for ' + key +  ' is illegal'
                });
                continue;
            }

            if (fieldConfig.type instanceof EasyCheck) {
                if (!fieldConfig.type.check(value, fieldConfig.type._config)) {
                    errors.push({
                        'type' : fieldConfig,
                        'field' : key,
                        'value' : value,
                        'defaultMessage' : '"' + value + '" doesn\'t match the schema provided for ' + key
                    });
                }
                continue;
            }

            if (!isValidType(fieldConfig.type, value)) {
                errors.push({
                    'type' : fieldConfig,
                    'field' : key,
                    'value' : value,
                    'defaultMessage' : '"' + value + '" doesn\'t match the type provided for ' + key
                });
            }

            if ((typeof value === "string" || _.isArray(value))
                && !checkLength(value, fieldConfig)) {
                errors.push({
                    'type' : fieldConfig,
                    'field' : key,
                    'value' : value,
                    'defaultMessage' : '"' + value + '" isn\'t long enough'
                });
            }

            if (fieldConfig.regex instanceof RegExp) {
                execArray = fieldConfig.regex.exec(value);

                if (_.isArray(execArray)) {
                    execValue = execArray.shift();
                }

                if (value !== execValue || null === execValue) {
                    errors.push({
                        'type' : fieldConfig,
                        'field' : key,
                        'value' : value,
                        'defaultMessage' : '"' + value + '" doesn\'t match the Regular Expression'
                    });
                }
            }

            if (_.isArray(value) && typeof fieldConfig.contains !== "undefined"
                && !checkArrayValues(value, fieldConfig.contains)) {
                errors.push({
                    'type' : fieldConfig,
                    'field' : key,
                    'value' : value,
                    'defaultMessage' : '"' + value + '" doesn\'t contain type: ' + fieldConfig.contains
                });
            }

            if (typeof fieldConfig.references !== "undefined" && !checkReference(value, fieldConfig.references)) {
                errors.push({
                    'type' : fieldConfig,
                    'field' : key,
                    'value' : value,
                    'defaultMessage' : 'Reference for "' + value + '" has not been found!'
                });
            }
        }

        if (errors.length > 0) {
            options.onError(errors);
            return false;
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

            return isValid(obj, conf, options);
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

            meteorMethods[name + '_update'] = function (selector, modifier, opts) {
                var newDoc,
                    console = console || {},
                    oldDocs = collection.find(selector).fetch();

                if (options.onUpdate(selector, modifier, options)) {
                    collection.update(selector, modifier, opts);
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

            collection._config = that._config;
        }

        return that;
    };
}();