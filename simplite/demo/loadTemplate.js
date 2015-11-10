define(function (require) {

    var templateLoader = require('template-loader');

    templateLoader('../demo/templates.tpl', function (simplite, templateMap) {

        simplite.addFilter('abc', function (name) {
            return '<div style="background: red;">ttest filter</div>';
        });
        var html = simplite.render('table-tpl', {
            name: 'test',
            gender: '男',
            age: 12,
            c: {
                name: '小比',
                gender: '《<div>双性人</div>',
                age: 27
            }
        });
        console.log(templateMap);
        document.getElementById('div').innerHTML = html;
    });
})