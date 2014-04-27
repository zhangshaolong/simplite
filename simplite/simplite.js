/**
 * @file 超轻量前端模板引擎，支持无限嵌套，逻辑嵌套模板，模板嵌套逻辑；
 * 标准js语法，灵活易用，超便捷指定数据
 * @author：张少龙（zhangshaolong@baidu.com）
 */
var Simplite = function() {
    // 模板编译缓存
    var templateCache = {};
    var isType = function(type) {
        var toString = Object.prototype.toString;
        return function(target) {
            return toString.call(target) === '[object ' + type + ']';
        };
    };
    var isString = isType('String');
    var isArray = isType('Array');
    /**
     * 获取dom元素
     * @private param {string|dom|jquery} idOrNode 支持domId，dom元素和jquery包装的dom元素方式
     * @return {dom} 返回指定的dom元素
     */
    var getNode = function(idOrNode) {
        if (isString(idOrNode)) {
            return document.getElementById(idOrNode);
        } else if (idOrNode.nodeName) {
            return idOrNode;
        } else {
            return idOrNode[0];
        }
    };
    /**
     * 获取指定dom元素的字符串模板
     * @private param {string|dom|jquery} idOrNodeOrHtml 支持domId，dom元素和jquery包装的dom元素方式或者html字符串
     * @return {string} dom结构的字符串形式
     */
    var getTemplate = function(idOrNodeOrHtml) {
        var node = getNode(idOrNodeOrHtml);
        if (node) {
            return node.innerHTML;
        } else {
            return idOrNodeOrHtml;
        }
    };
    var stringify = function(code) {
        return "'"
                + code.replace(/('|\\)/g, '\\$1').replace(/\r/g, '\\r')
                        .replace(/\n/g, '\\n') + "'";
    };
    // 转义对应表
    var htmlMeta = {
        '&' : '&amp;',
        '<' : '&lt;',
        '>' : '&gt;',
        '"' : '&quot;',
        "'" : '&#39;',
        '\\' : '\\\\',
        '\"' : '\\"'
    };
    /**
     * 对html元素进行转义
     * @private param {string} txt html字符串
     * @return {string} 返回转义好的html字符串
     */
    var escapeHTML = function(txt) {
        if (typeof txt === 'undefined') {
            return '';
        }
        if (typeof txt !== 'string') {
            return txt;
        }
        return txt.replace(/\\|\"|&|<|>|"|'/g, function(ch) {
            return htmlMeta[ch];
        });
    };
    /**
     * 解析开始标签
     * @private param {string} text html模板
     * @return {array.string} 返回根据开始标签分割的数组
     */
    var parseOpenTag = function(text, openTag) {
        return text.split(openTag);
    };
    /**
     * 解析闭合标签
     * @private param {string} segment html模板段
     * @return {array.string} 返回根据闭合标签分割的数组
     */
    var parseCloseTag = function(segment, closeTag) {
        return segment.split(closeTag);
    };
    /**
     * 是否逻辑标签和属性标签使用一套
     * （注意：针对部分一致的标签可能会造成解析问题）
     */
    var isSameTag = function () {
        return Simplite.attrOpenTag === Simplite.logicOpenTag
            && Simplite.attrCloseTag === Simplite.logicCloseTag
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
                out += 'out += Simplite.escapeHTML(' + attr.substr(1) + ');';
            } else {
                out += 'out += ' + attr + ';';
            }
        }
        if (html) {
            out += 'out += ' + stringify(html) + ';';
        }
        return out;
    };
    /**
     * 逻辑标签处理器（当属性与逻辑使用相同标签时一起解析）
     * @private param {string} js 代码逻辑或者属性
     * @private param {string} html 可能包含自定义属性标签的html片段
     * @return {string} 返回解析好的js代码段
     */
    var logicHandler = function (js, html) {
        var out = '';
        if (js) {
            // 处理子模板，未处理xxx.include情况
            js = js.replace(/(\W)?(include\s*\(([^\)]+)\))/g, function(all,
                    pre, include, args) {
                if (args.indexOf(',') < 0) { // 不应该有第一个字符为“,”的情况。
                    args = args + ',_this';
                }
                return (pre || '') + 'out += Simplite.include(' + args + ')';
            });
            if (/[^\{;]\s*$/.test(js)) {
                js += '\n'; // 为没有分号的情况添加换行，利用浏览器解析token
            }
            if (isSameTag()) {
                if (/^=\s*(.)/.test(js)) { // 是否是获取数据
                    if (RegExp.$1 === '#') { // 此数据需要html转义
                        js = 'out += Simplite.escapeHTML(' + js.substr(2) + ');';
                    } else {
                        js = 'out += ' + js.substr(1) + ';';
                    }
                }
            }
            out += js;
        }
        if (html) {
            if (!isSameTag()) {// 处理自定义属性标签
                out += parse2Block(html, Simplite.attrOpenTag,
                    Simplite.attrCloseTag, customAttrHandler);
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
     * @private param {function} hanlder 具体根据解析生成语句段的处理器
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
     * @private param {string} text html模板
     * @return {string} 返回根据html模板转换为可运行js的字符串形式
     */
    var parse = function(text) {
        return  'var out = "";' + parse2Block(text, Simplite.logicOpenTag,
            Simplite.logicCloseTag, logicHandler);
    };
    /**
     * html模板编译
     * @private
     * @return {function(string)} 返回根据html模板编译好的处理函数
     */
    var compile = function(template) {
        var dataLoader = templateCache[template];
        if (!dataLoader) {
            var code = parse(template);
            dataLoader = templateCache[template] = new Function('obj',
                    'with (obj) {var _this = obj;' + code + '; return out;}');
        }
        return dataLoader;
    };
    /**
     * 引入子模板
     * @private
     * @param {string|Dom|Jquery} template 模板元素或者模板html
     * @param {object} data 用来填充模板的数据
     * @return {string} 返回使用data数据填充好模板的html字符串
     */
    var include = function(template, data) {
        template = getTemplate(template);
        return toHtml(template, data);
    };
    /**
     * 向模板填充数据
     * @private
     * @param {string} template 模板html
     * @param {object} data 用来填充模板的数据
     * @return {string} 返回使用data数据填充好模板的html字符串
     */
    var toHtml = function(template, data) {
        return compile(template)(data);
    };
    /**
     * 根据字符串的html生成dom节点并添加到target元素
     * @private
     * @param {string|Dom|Jquery} target html填充到的指定元素
     * @param {string} html 用来填充模板的已经填充好数据的字符串html
     * @param {function(target)=} fun 回调函数
     */
    var render = function(target, html, fun) {
        target = getNode(target);
        target.innerHTML = html;
        fun && fun(target);
    };

    /**
     * 模板对象构造器，可以使用new初始化模板对象，也可以使用静态函数方式完成模板相关功能调用
     * @constructor
     * @param {Object} options 初始化配置参数
     * @param {string|Dom|Jquery} option.target 模板填充到的指定元素，支持domId，dom元素和jquery包装的dom元素方式
     * @param {string|Dom|Jquery} option.template 模板元素或模板内容
     */
    var Simplite = function(options) {
        this.target = getNode(options.target);
        this.template = getTemplate(options.template);
    };
    /**
     * html模板编译
     * @public
     * @return {function(object)} 返回根据html模板编译好的处理函数
     */
    Simplite.prototype.compile = function() {
        return compile(this.template);
    };
    /**
     * 模板渲染到dom树
     * @public
     * @return {function(object)} 返回根据html模板编译好的处理函数
     */
    Simplite.prototype.render = function(data) {
        this.beforerender(data);
        render(this.target, toHtml(this.template, data), this.afterrender);
    };
    /**
     * 模板渲染前事件
     * @public
     * @event
     * @param {object} 用来渲染模板的数据
     */
    Simplite.prototype.beforerender = function(data) {
    };
    /**
     * 模板渲染后事件
     * @public
     * @event
     * @param {dom} 模板渲染到的dom元素
     */
    Simplite.prototype.afterrender = function(node) {
    };
    /**
     * 以下是公开的静态函数
     */
    // 默认逻辑开始标签
    Simplite.logicOpenTag = '<%';
    // 默认逻辑闭合标签
    Simplite.logicCloseTag = '%>';
    // 默认属性开始标签
    Simplite.attrOpenTag = '<%';
    // 默认属性闭合标签
    Simplite.attrCloseTag = '%>';
    Simplite.escapeHTML = escapeHTML;
    Simplite.getTemplate = getTemplate;
    Simplite.include = include;
    Simplite.compile = compile;
    Simplite.toHtml = toHtml;
    Simplite.render = render;
    return Simplite;
}();