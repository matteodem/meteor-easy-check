Package.describe({
    summary : "CRUD Generator package for meteor"
});

Package.on_use(function (api) {
    api.use('jquery', 'client');
    api.use('underscore', 'client');

    api.add_files([
        'lib/css/bootstrap.min.css',
        'lib/css/pure-min.css',
        'lib/crud-generator-client.js'
    ], 'client');

    api.add_files([
        'lib/crud-generator-both.js'
    ], ['client', 'server']
    );
});

Package.on_test(function (api) {
    api.use(
        ['crud-generator', 'tinytest', 'test-helpers']
    );
    api.add_files(
        'tests/generatorTests.js',
        ['client', 'server']
    );
});