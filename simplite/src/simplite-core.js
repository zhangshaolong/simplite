/**
 * @file 超轻量前端模板引擎，支持无限嵌套，逻辑嵌套模板，模板嵌套逻辑； 标准js语法，灵活易用，超便捷指定数据
 * @author：张少龙（zhangshaolongjj@163.com）
 */
(function (root, factory) {
    var simplite = factory();
    if (typeof define === 'function') {
        define(function () {
            return simplite;
        });
    } else if (typeof require === 'undefined') {
        root.Simplite = simplite;
    } else { // node端接口
        root.logicOpenTag = simplite.logicOpenTag;
        root.logicCloseTag = simplite.logicCloseTag;
        root.attrOpenTag = simplite.attrOpenTag;
        root.attrCloseTag = simplite.attrCloseTag;
        root.dataKey = simplite.dataKey;
        root.addFilter = simplite.addFilter;
        root.addTemplate = simplite.addTemplate;
        root.include = simplite.include;
        root.filter = simplite.filter;
        root.compile = simplite.compile;
        root.render = simplite.render;
    }
})(this, function () {
    'use strict'
    // 默认逻辑开始标签
    var logicOpenTag = '<%';
    // 默认逻辑闭合标签
    var logicCloseTag = '%>';
    // 默认属性开始标签
    var attrOpenTag = '<%=';
    // 默认属性闭合标签
    var attrCloseTag = '%>';
    // 默认使用_this作为传入数据的载体，可以使用_this.a获取数据中的a属性的值
    var dataKey = '_this';
    //默认的过滤器
    var filters = {
        escape: function () {
            // 转义对应表
            var htmlMeta = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                '\'': '&#39;',
                '\\': '\\\\'
            };
            var escapeReg = /\\|&|<|>|"|'/g;
            /**
             * 对html元素进行转义
             * @private param {string} txt html字符串
             * @return {string} 返回转义好的html字符串
             */
            return function (txt) {
                if (typeof txt === 'undefined') {
                    return '';
                }
                if (typeof txt !== 'string') {
                    return txt;
                }
                return txt.replace(escapeReg, function (ch) {
                    return htmlMeta[ch];
                });
            };
        }()
    };

    var slice = Array.prototype.slice;

    var mixin = function (from, to) {
        for (var key in from) {
            if (!to[key]) {
                to[key] = from[key];
            }
        }
        return to;
    };

    /**
     * 模板对象构造器，可以使用new初始化模板对象，也可以使用静态函数方式 完成模板相关功能调用
     * @constructor
     * @param {Object} options 初始化配置参数
     * @param {string|Dom|Jquery} option.target 模板填充到的指定元素， 支持domId，dom元素和jquery包装的dom元素方式
     * @param {string|Dom|Jquery} option.template 模板元素或模板内容
     */
    var Simplite = function (options) {
        options = options || {};
        this.filters = mixin(filters, options.filters || {});
        this.templates = options.templates || {};
        this.logicOpenTag = options.logicOpenTag || logicOpenTag;
        this.logicCloseTag = options.logicCloseTag || logicCloseTag;
        this.attrOpenTag = options.attrOpenTag || attrOpenTag;
        this.attrCloseTag = options.attrCloseTag || attrCloseTag;
        this.dataKey = options.dataKey || dataKey;
        this.compiles = {};
    };

    // 编译过的模板的集合
    Simplite.compiles = {};
    // 注入的过滤器集合
    Simplite.filters = filters;
    // 注入的模板集合
    Simplite.templates = {};

    Simplite.logicOpenTag = logicOpenTag;
    Simplite.logicCloseTag = logicCloseTag;
    Simplite.attrOpenTag = attrOpenTag;
    Simplite.attrCloseTag = attrCloseTag;
    Simplite.dataKey = dataKey;

    /**
     * 为模板引擎注入过滤方法
     * @private
     * @param {string} name 注入的方法名称
     * @param {Function} fun 注入的方法
     * @param {Simplite?} simplite 当前的Simplite实例
     */
    Simplite.addFilter = function (name, fun, simplite) {
        (simplite || Simplite).filters[name] = fun;
    };

    /**
     * 为模板引擎注册模板
     * @private
     * @param {string} name 注入的方法名称
     * @param {Function} fun 注入的方法
     * @param {Simplite?} simplite 当前的Simplite实例
     */
    Simplite.addTemplate = function (name, template, simplite) {
        (simplite || Simplite).templates[name] = template;
    };

    /**
     * 添加处理过滤数据方法
     * @private
     * @param {string} name 需要调用的方法名称
     * @param {*} ... 传入方法的不定长参数
     * @return {string} 返回过滤之后的结果
     */
    Simplite.filter = function (name) {
        return this.filters[name].apply(this, slice.call(arguments, 1));
    };

    /**
     * 引入子模板
     * @private
     * @param {string|Dom|Jquery} template 模板元素或者模板html
     * @param {Object} data 用来填充模板的数据
     * @return {string} 返回使用data数据填充好模板的html字符串
     */
    Simplite.include = function (name, data) {
        return Simplite.render(name, data, this);
    };

    // 分析关键词语法
    var keywordReg = /(^|[^\s])\s*(include|filter)\s*\(([^;]+)\)/g;
    var quotReg = /"/g;
    var commentAndTagBlankTrimReg = /(?:(["'])[\s\S]*?\1)|(?:\/\/.*?\n)|(?:\/\*([\s\S])*?\*\/)|(?:\>\s+\<)|(?:\s+)/g;

    Simplite.compile = function (name, simplite) {
        simplite = simplite || Simplite;
        var attrTagReg = simplite.attrTagReg;
        var logicOpenTagReg = simplite.logicOpenTagReg;
        var logicCloseTagReg = simplite.logicCloseTagReg;
        var htmlReg = simplite.htmlReg;
        if (!attrTagReg) {
            attrTagReg = simplite.attrTagReg = new RegExp(simplite.attrOpenTag + '([\\s\\S]+?)' + simplite.attrCloseTag, 'g');
            logicOpenTagReg = simplite.logicOpenTagReg = new RegExp('(?=\\s?)' + simplite.logicOpenTag + '\\s?', 'g');
            logicCloseTagReg = simplite.logicCloseTagReg = new RegExp('\\s?' + simplite.logicCloseTag + '(?=\\s?)', 'g');
            htmlReg = simplite.htmlReg = new RegExp('(?:' + simplite.logicCloseTag  + '|^)(?:(?!' + simplite.logicOpenTag + ')[\\s\\S])+?(?:$|' + simplite.logicOpenTag + ')', 'g');
        }
        var commentAndTagBlankTrimHandler = function (all) {
            var start = all.charAt(0);
            switch (start) {
                case '/' :
                    return '';
                case '"' :
                case "'" :
                    return all;
                case '>' :
                    return '><';
                default :
                    return ' ';
            }
        };
        var attrHandler = function (all, p) {
            if (p.charAt(0) === '#') {
                return '"+_t.filter("escape",' + p.slice(1) + ')+"';
            }
            return '"+(' + p + ')+"';
        };
        var keywordHandler = function (all, pre, keyword, args) {
            if (pre === '.') {
                return all;
            }
            if (args.indexOf(',') < 0) {
                args = args + ',' + simplite.dataKey;
            }
            return (pre || '') + ' _o+=_t.' + keyword + '(' + args + ');';
        };
        var htmlHandler = function (all) {
            return all.replace(quotReg, '\\"');
        };
        var html = simplite.templates[name]
            .replace(commentAndTagBlankTrimReg, commentAndTagBlankTrimHandler)
            .replace(htmlReg, htmlHandler)
            .replace(attrTagReg, attrHandler)
            .replace(logicOpenTagReg, '";')
            .replace(logicCloseTagReg, ' _o+="')
            .replace(keywordReg, keywordHandler);
        try {
            var renderer = new Function (simplite.dataKey, '"use strict";\nvar _t=this,_o="' + html + '";return _o;');
            return function (data) {
                return renderer.call(simplite, data);
            };
        } catch (e) {
            throw e;
        }
    };

    /**
     * 向模板渲染成填充好数据的dom片段的字符串形式
     * @private
     * @param {string} template 模板html
     * @param {Object} data 用来填充模板的数据
     * @return {string} 返回使用data数据填充好模板的html字符串
     */
    Simplite.render = function (name, data, simplite) {
        simplite = simplite || Simplite;
        var renderer = simplite.compiles[name];
        if (!renderer) {
            renderer = simplite.compiles[name] = Simplite.compile(name, simplite);
        }
        return renderer(data);
    };

    /**
     * html模板编译
     * @public
     * @return {Function(Object)} 返回根据html模板编译好的处理函数
     */
    Simplite.prototype.compile = function (name) {
        return Simplite.compile(name, this);
    };

    /**
     * 使用data的数据渲染指定name的模板
     * @public
     * @return {Function(Object)} 返回带数据的字符串形式的html
     */
    Simplite.prototype.render = function (name, data) {
        return Simplite.render(name, data, this);
    };

    /**
     * 注入名字为name的filter
     * @public
     * @param {string} name 注入的方法名称
     * @param {Function} fun 注入的方法
     */
    Simplite.prototype.addFilter = function (name, fun) {
        Simplite.addFilter(name, fun, this);
    };

    /**
     * 注册模板，主要为name和html模板建立关联，方便后续获取
     * @public
     * @param {string} name 模板的名称
     * @param {string} template 模板
     */
    Simplite.prototype.addTemplate = function (name, template) {
        Simplite.addTemplate(name, template, this);
    };

    /**
     * 使用指定name的filter对传入的数据做处理
     * @public
     * @param {string} name 注入的方法名称
     * @param {*} ... 传入方法的不定长参数
     */
    Simplite.prototype.filter = function (name) {
        return Simplite.filter.apply(this, arguments);
    };

    /**
     * 根据name导入模板
     * @public
     * @param {string} name 注入的方法名称
     * @param {*} data 给模板传入的数据集
     */
    Simplite.prototype.include = function (name, data) {
        return Simplite.include.apply(this, arguments);
    };

    return Simplite;
});