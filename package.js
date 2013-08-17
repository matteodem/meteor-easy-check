Package.describe({
    summary : "CRUD Generator package for meteor"
});

Package.on_use(function (api) {
    api.use('jquery', 'client');
    api.use('underscore', 'client');

    api.add_files([
        'lib/crud-generator.js',
        'lib/css/purecss-form.css'
    ], 'client'
    );
    
    api.add_files([
        'lib/crud-generator.js'
    ], 'server'
    );
});