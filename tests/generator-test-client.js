Tinytest.add('CrudGenerator - MarkupGenerator - Constructor', function (test) {
    var markupGenerator = crud.markupGenerator;

    test.equal(
        markupGenerator.options,
        {
            'formClass' : '',
            'tableClass' : '',
            'additionalFormClasses' : '',
            'additionalTableClasses' : ''
        },
        'Should have initialized a standard object since no options for the markup generator were passed'
    );
});

Tinytest.add('CrudGenerator - MarkupGenerator - Test escapeHtml', function (test) {
    var markupGenerator = crud.markupGenerator;

    test.equal(
        markupGenerator.escapeHtml(''),
        '',
        'Shouldn\'t do anything with an empty string'
    );

    test.equal(
        markupGenerator.escapeHtml('<input type="textfield">'),
        '&lt;input type=&quot;textfield&quot;&gt;',
        'Should escape the html string properly'
    );

    test.equal(
        markupGenerator.escapeHtml('/\'"/'),
        '&#x2F;&#39;&quot;&#x2F;',
        'Should escape the html string properly'
    );
});