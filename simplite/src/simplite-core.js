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
    var attrOpenTag = '<%';
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

    var isType = function (type) {
        var toString = Object.prototype.toString;
        return function (target) {
            return toString.call(target) === '[object ' + type + ']';
        };
    };

    var maxin = function (from, to) {
        for (var key in from) {
            if (!to[key]) {
                to[key] = from[key];
            }
        }
        return to;
    };
    
    var isString = isType('String');

    var isArray = isType('Array');

    var stringify = function () {
        var qReg = /('|\\)/g;
        var rReg = /\r/g;
        var nReg = /\n/g;
        var qStrfy = '\\$1';
        var rStrfy = '\\r';
        var nStrfy = '\\n';
        return function (code) {
            return "'" + code.replace(qReg, qStrfy).replace(rReg, rStrfy).replace(nReg, nStrfy) + "'";
        };
    }();

    /**
     * 解析开始标签
     * @private param {string} text html模板
     * @return {Array.<string>} 返回根据开始标签分割的数组
     */
    var parseOpenTag = function (text, openTag) {
        return text.split(openTag);
    };

    /**
     * 解析闭合标签
     * @private param {string} segment html模板段
     * @return {Array.<string>} 返回根据闭合标签分割的数组
     */
    var parseCloseTag = function (segment, closeTag) {
        return segment.split(closeTag);
    };

    /**
     * 是否逻辑标签和属性标签使用一套 （注意：针对部分一致的标签可能会造成解析问题）
     */
    var isSameTag = function () {
        return Simplite.attrOpenTag === Simplite.logicOpenTag && Simplite.attrCloseTag === Simplite.logicCloseTag
    };

    /**
     * 自定义属性标签处理器
     * @private param {string} attr 属性
     * @private param {string} html 没有属性的html片段
     * @return {string} 返回解析好的js代码段
     */
    var customAttrHandler = function (attr, html) {
        var out = '';
        if (attr) {
            if (attr.indexOf('#') === 0) {
                out += 'out += this.filter("escape", ' + attr.substr(1) + ');';
            } else {
                out += 'out += ' + attr + ';';
            }
        }
        if (html) {
            out += 'out += ' + stringify(html) + ';';
        }
        return out;
    };

    // 分析关键词语法
    var keywordReg = /(^|[^\s])\s*(include|filter)\s*\(([^;]+)\)/g;

    // 分析是否添加分号的正则
    var semicolonReg = /[^\{;]\s*$/;

    // 分析属性的正则
    var propertyReg = /^=\s*(.)/;

    /**
     * 逻辑标签处理器（当属性与逻辑使用相同标签时一起解析）
     * @private param {string} js 代码逻辑或者属性
     * @private param {string} html 可能包含自定义属性标签的html片段
     * @return {string} 返回解析好的js代码段
     */
    var logicHandler = function (js, html) {
        var out = '';
        if (js) {
            js = js.replace(keywordReg, function (all, pre, keyword, args) {
                if (pre === '.') {
                    return all;
                }
                if (args.indexOf(',') < 0) {
                    args = args + ',' + Simplite.dataKey;
                }
                return (pre || '') + ' out += this.' + keyword + '(' + args + ')';
            });
            if (semicolonReg.test(js)) {
                js += '\n'; // 为没有分号的情况添加换行，利用浏览器解析token
            }
            if (isSameTag()) {
                if (propertyReg.test(js)) { // 是否是获取数据
                    if (RegExp.$1 === '#') { // 此数据需要html转义
                        js = 'out += this.filter("escape", ' + js.substr(2) + ');';
                    } else {
                        js = 'out += ' + js.substr(1) + ';';
                    }
                }
            }
            out += js;
        }
        if (html) {
            if (!isSameTag()) {// 处理自定义属性标签
                out += parse2Block(html, Simplite.attrOpenTag, Simplite.attrCloseTag, customAttrHandler);
            } else {
                out += 'out += ' + stringify(html) + ';';
            }
        }
        return out;
    };

    /**
     * 模板逻辑和属性标签处理器
     * @private param {string} text 处理文本
     * @private param {string} openTag 开始标签
     * @private param {string} openTag 闭合标签
     * @private param {Function} hanlder 具体根据解析生成语句段的处理器
     * @return {string} 返回解析好的js代码段
     */
    var parse2Block = function (text, openTag, closeTag, hanlder) {
        var out = '';
        var segments = parseOpenTag(text, openTag);
        for (var i = 0, len = segments.length; i < len; i++) {
            var segment = segments[i];
            var jsAndHtml = parseCloseTag(segment, closeTag);
            var js = jsAndHtml[0];
            var html = jsAndHtml[1];
            if (html === undefined) {
                html = js;
                js = '';
            }
            out += hanlder(js, html);
        }
        return out;
    };

    /**
     * html模板解析
     * @private 
     * @param {string} text html模板
     * @return {string} 返回根据html模板转换为可运行js的字符串形式
     */
    var parse = function (text) {
        return 'var out = "";' + parse2Block(text, Simplite.logicOpenTag, Simplite.logicCloseTag, logicHandler);
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
        this.filters = maxin(filters, options.filters || {});
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
        return this.filters[name].apply(null, slice.call(arguments, 1));
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
    
    Simplite.compile = function (name, simplite) {
        simplite = simplite || Simplite;
        var renderer = simplite.compiles[name];
        if (renderer) {
            return renderer;
        }
        renderer = new Function(simplite.dataKey, parse(simplite.templates[name]) + 'return out;');
        return simplite.compiles[name] = (renderer.bind ? renderer.bind(simplite) : function () {
            return renderer.apply(simplite, slice.call(arguments));
        });
    };
    
    /**
     * 向模板渲染成填充好数据的dom片段的字符串形式
     * @private
     * @param {string} template 模板html
     * @param {Object} data 用来填充模板的数据
     * @return {string} 返回使用data数据填充好模板的html字符串
     */
    Simplite.render = function (name, data, simplite) {
        return Simplite.compile(name, simplite)(data);
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
        this.beforerender(data);
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
     * 使用指定name的filter对传入的数据做处理
     * @public
     * @param {string} name 注入的方法名称
     * @param {*} ... 传入方法的不定长参数
     */
    Simplite.prototype.filter = function (name) {
        return Simplite.filter.apply(this, arguments);
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