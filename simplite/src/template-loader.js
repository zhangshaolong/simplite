/**
 * @file Simplate模板加载器，自动进行预编译
 * @author：张少龙（zhangshaolongjj@163.com）
 */
define(function (require) {
    var Simplite = require('simplite');
    var tplReg = /\{\{\s*\-\-\s*tpl\s*\:\s*([^\}\s]+)\s*\-\-\s*\}\}\s*([\s\S]*?)\{\{\s*\-\-\s*\/tpl\s*\-\-\s*\}\}/g;
    return function (path, simplite, callback) {
        if (!(simplite instanceof Simplite)) {
            callback = simplite;
            simplite = Simplite;
        }

        requirejs(['text!' + path], function (text) {
            var templateMap = {};
            text.replace(tplReg, function (all, tplId, tplContent) {
                simplite.addTemplate(tplId, tplContent);
                simplite.compile(tplId, simplite);
                templateMap[tplId] = tplContent;
            });
            if (callback) {
                callback(simplite, templateMap);
            }
        });
    };
});