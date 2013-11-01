Package.describe({
    summary : "Easy way to validate objects for a Meteor.Collection"
});

Package.on_use(function (api) {
    api.use('underscore');

    api.add_files([
        'lib/easy-check.js'
    ], ['client', 'server']
    );

    api.export('EasyCheck');
});

Package.on_test(function (api) {
    api.use(
        ['easy-check', 'tinytest', 'test-helpers']
    );
    api.add_files(
        'tests/easy-check-tests.js',
        ['client', 'server']
    );
});