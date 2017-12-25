define(function (require) {

    var templateLoader = require('template-loader');

    templateLoader('../demo/templates.tpl', function (simplite, templateMap) {
        simplite.addFilter('abc', function (name) {
            return '<div style="background: red;">ttest filter被转义的html元素</div>';
        });
        var html = simplite.render('table-tpl', {
            name: '外层数ttt据name',
            gender: '男',
            age: 12,
            c: {
                name: '内层数据name',
                gender: '《<div style="color: red;">带颜色的div内的内容</div>',
                age: 27
            }
        });
        console.log(templateMap);
        document.getElementById('div').innerHTML = html;
    });
})