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
        module.exports = simplite;
    }
})(this, function () {
    'use strict'

    var slice = Array.prototype.slice;

    var mixin = function (from, to) {
        for (var key in from) {
            if (!to[key]) {
                to[key] = from[key];
            }
        }
        return to;
    };

    var getConfig = function (options) {
        options = options || {};
        return {
            // 默认逻辑开始标签
            logicOpenTag: options.logicOpenTag || '<%',
            // 默认逻辑闭合标签
            logicCloseTag: options.logicCloseTag || '%>',
            // 默认属性开始标签
            attrOpenTag: options.attrOpenTag || '<%=',
            // 默认属性闭合标签
            attrCloseTag: options.attrCloseTag || '%>',
            // 默认使用_this作为传入数据的载体，可以使用_this.a获取数据中的a属性的值
            dataKey: options.dataKey || '_this',
            // 初始化已编译存储容器
            compiles: {},
            // 初始化已加载模板存储容器
            templates: {},
            //默认的过滤器
            filters: options.filters || {
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
            }
        };
    };

    /**
     * 模板对象构造器，可以使用new初始化模板对象，也可以使用静态函数方式 完成模板相关功能调用
     * @constructor
     * @param {Object} options 初始化配置参数
     */
    var Simplite = function (options) {
        mixin(getConfig(options), this);
    };

    mixin(getConfig(), Simplite);

    /**
     * 为模板引擎注入过滤方法
     * @param {string} name 注入的方法名称
     * @param {Function} fun 注入的方法
     * @param {Simplite?} simplite 当前的Simplite实例
     */
    Simplite.addFilter = function (name, fun, simplite) {
        (simplite || Simplite).filters[name] = fun;
    };

    /**
     * 获取名字为name的filter
     * @param {string} name 注入的方法名称
     * @param {Simplite?} simplite 当前的Simplite实例
     * @return {Function} fun 注入的方法
     */
    Simplite.getFilter = function (name, simplite) {
        return (simplite || Simplite).filters[name];
    };

    /**
     * 为模板引擎注册模板
     * @param {string} name 注入的模板名称
     * @param {string} template 模板内容字符串
     * @param {Simplite?} simplite 当前的Simplite实例
     */
    Simplite.addTemplate = function (name, template, simplite) {
        (simplite || Simplite).templates[name] = template;
    };

    /**
     * 添加处理过滤数据方法
     * @param {string} name 需要调用的方法名称
     * @param {*} ... 传入方法的不定长参数
     * @return {string} 返回过滤之后的结果
     */
    Simplite.filter = function (name) {
        return this.filters[name].apply(this, slice.call(arguments, 1));
    };

    /**
     * 引入子模板
     * @param {string} name 子模板名称
     * @param {*?} data 用来填充模板的数据
     * @return {string} 返回使用data数据填充好模板的html字符串
     */
    Simplite.include = function (name, data) {
        var len = arguments.length;
        if (len > 2) {
            var _this = arguments[len - 1];
            data = {};
            for (var i = 1; i < len - 1; i++) {
                var arg = arguments[i];
                if (arg != null) {
                    if (arg.constructor === Object) {
                        for (var key in arg) {
                            data[key] = arg[key];
                        }
                    } else {
                        data = arg;
                    }
                }
            }
            if (data.constructor === Object && _this != null && _this.constructor === Object) {
                for (var key in _this) {
                    if (!data.hasOwnProperty(key)) {
                        data[key] = _this[key];
                    }
                }
            }
        }
        return Simplite.render(name, data, this);
    };

    // 分析关键词语法
    var keywordReg = /(^|[^\s])\s*(include|filter)\s*\(([^;]+)\)/g;
    // 分析filter关键词语法
    var filterReg = /^\s*filter\(/g;
    var quotReg = /"/g;
    var endTokenReg = /\n/g;
    var commentAndTagBlankTrimReg = /(?:(["'])[\s\S]*?\1)|(?:\/\/.*\n)|(?:\/\*([\s\S])*?\*\/)|(?:\>\s+\<)|(?:\s+)/g;

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
            return '"+_t.defaultAttr(_t.filter("escape",' + p.slice(1).replace(filterReg, '_t.filter(') + '))+"';
        }
        return '"+_t.defaultAttr(' + p.replace(filterReg, '_t.filter(') + ')+"';
    };
    var htmlHandler = function (all) {
        return all.replace(quotReg, '\\"').replace(endTokenReg, '\\n');
    };

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
        try {
            var renderer = new Function (simplite.dataKey, simplite.toCodeBlock(simplite.templates[name], simplite));
            return function (data) {
                return renderer.call(simplite, data);
            };
        } catch (e) {
            console && console.log && console.log(name, e.stack || e);
            throw e;
        }
    };

    /**
     * 向模板渲染成填充好数据的dom片段的字符串形式
     * @param {string} name 模板名称
     * @param {*?} data 用来填充模板的数据
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
     * 把字符串模板编译成代码语句字符串
     * @param {string} template 模板内容
     * @param {Simplite} simplite Simplite对象，默认为Simplite类
     * @return {string} 返回函数体的字符串形式
     */
    Simplite.toCodeBlock = function (template, simplite) {
        var keywordHandler = function (all, pre, keyword, args) {
            if (pre === '.') {
                return all;
            }
            return (pre || '') + ' _o+=_t.' + keyword + '(' + args + ',' + simplite.dataKey + ')\n';
        };
        simplite = simplite || Simplite;
        var codeBlock = template.replace(simplite.htmlReg, htmlHandler)
        .replace(commentAndTagBlankTrimReg, commentAndTagBlankTrimHandler)
        .replace(simplite.attrTagReg, attrHandler)
        .replace(simplite.logicOpenTagReg, '";')
        .replace(simplite.logicCloseTagReg, '\n_o+="')
        .replace(keywordReg, keywordHandler);
        return '"use strict"\nvar _t=this,_o="' + codeBlock + '";return _o;';
    };

    /**
     * 输出的属性值的默认值
     * @param {string} val 原始的属性值
     * @return {string} 当原始值不存在时的默认值
     */
    Simplite.defaultAttr = function (val) {
        return val == null ? '' : val;
    };

    /**
     * html模板编译
     * @param {string} name 模板名称
     * @return {Function(Object)} 返回根据html模板编译好的处理函数
     */
    Simplite.prototype.compile = function (name) {
        return Simplite.compile(name, this);
    };

    /**
     * 使用data的数据渲染指定name的模板
     * @param {string} name 模板名称
     * @param {*?} data 用来填充模板的数据
     * @return {Function(Object)} 返回带数据的字符串形式的html
     */
    Simplite.prototype.render = function (name, data) {
        return Simplite.render(name, data, this);
    };

    /**
     * 注入名字为name的filter
     * @param {string} name 注入的方法名称
     * @param {Function} fun 注入的方法
     */
    Simplite.prototype.addFilter = function (name, fun) {
        Simplite.addFilter(name, fun, this);
    };

    /**
     * 获取名字为name的filter
     * @param {string} name 注入的方法名称
     * @return {Function} fun 注入的方法
     */
    Simplite.prototype.getFilter = function (name) {
        return Simplite.getFilter(name, this);
    };

    /**
     * 注册模板，主要为name和html模板建立关联，方便后续获取
     * @param {string} name 模板的名称
     * @param {string} template 模板
     */
    Simplite.prototype.addTemplate = function (name, template) {
        Simplite.addTemplate(name, template, this);
    };

    /**
     * 使用指定name的filter对传入的数据做处理
     * @param {string} name 注入的方法名称
     * @param {*} ... 传入方法的不定长参数
     */
    Simplite.prototype.filter = function (name) {
        return Simplite.filter.apply(this, arguments);
    };

    /**
     * 根据name导入模板
     * @param {string} name 注入的方法名称
     * @param {*?} data 给模板传入的数据集
     */
    Simplite.prototype.include = function (name, data) {
        return Simplite.include.apply(this, arguments);
    };

    /**
     * 输出的属性值的默认值
     * @param {string} val 原始的属性值
     * @return {string} 当原始值不存在时的默认值
     */
    Simplite.prototype.defaultAttr = function (val) {
        return Simplite.defaultAttr(val);
    };

    return Simplite;
});