Package.describe({
    summary : "CRUD Generator package for meteor"
});

Package.on_use(function (api) {
    api.use('jquery', 'client');
    api.use('underscore', 'client');

    api.add_files([
        'lib/css/bootstrap_form.css',
        'lib/css/purecss_form.css'
    ], 'client');

    api.add_files([
        'lib/crud-generator.js'
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