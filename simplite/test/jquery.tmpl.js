/*
 * tmpljs
 * A DOM element based templating engine with
 *  a logic-less Zen Coding-like markup, object caching, partials and variables
 *
 *  https://github.com/mastermatt/tmpljs
 *
 * Requires jQuery 1.4+
 */

(function($) {

    "use strict";

    var version = "0.12.1";

    // set the `value` property instead of `innerHTML` for these tags
    var setValuesFor = ["input", "textarea"];

    // Regex to break the main string into parts
    // example "   myFunc(p, 6).world[placeholder=some text] {myVar} yeah"
    // matches
    //      1: leading spaces                   "   "
    //      2: tag name or partial signature    "myFunc(p, 6)"
    //      3: partial name                     "myFunc"
    //      4: partial args                     "p, 6"
    //      5: everything else                  ".world[placeholder=some text] {myVar} yeah"
    var regLine = /^(\s*)(([\w.-]*)\((.*)\)|[\w-]*)(.*)$/;

    // Regex for explicitly stated attributes ( the stuff in square brackets )
    // matches
    //      1: attribute name   "placeholder"
    //      2: value            "some text"
    var regAttributes = /\[([\w-]+)=?([^\]]*)\]/g;

    // Regex for the modifiers ( class, id, cache )
    // matches
    //      1: type flag        ".", "#", "$"
    //      2: value            from the example above "world"
    var regModifiers = /([.#$])([\w-]+)/g;

    // Regex for the handlebar type variable syntax in text matches
    //      1: a bang for escaping literal brackets
    //      2: variable key
    var regVariables = /\{([!&]?)\s*([^\s\}]*)\s*\}/g;

    // escape HTML entities
    // https://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat_Sheet (rule #1)
    // loving borrowed from handlebars.js and mustache.js
    var regEscapeCharacters = /[&<>"'`\/]/g;

    var escapeCharacterLookup = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "`": "&#x60;", // IE can quote attributes with ticks too
        "/": '&#x2F;'
    };

    var escapeCharacters = function(character) {
        return escapeCharacterLookup[character];
    };

    // Turn dot notation in a string into object reference
    // example dotToRef("a.b.c", {a:{b:{c:42}}}) will return 42
    var dotToRef = function(notation, object) {
        var segments = notation.split(".");
        var i = 0;
        var len = segments.length;

        for (; i < len;) {
            object = object[segments[i++]];
        }

        return object;
    };

    // scratch vars
    var lastEl;
    var parentEl;
    var indexOfSpace;
    var textVal;
    var modVal;

    // The actual plugin function
    var tmpl = function(template, data, partials) {

        if (!$.isArray(template)) {
            throw "template must be array";
        }

        data = data || {};
        partials = partials || data;

        var ret = $();
        var templateIndex = 0;
        var templateLength = template.length;
        var lastDepth = 0;
        var objCache = {};

        // Replace variables in strings
        var varReplacer = function(match, flag, key) {

            // when a bang is supplied after the opening bracket, the brackets are treated as
            // literal and the string is returned like it was (minus the bang).
            if ("!" === flag) {
                return "{" + match.slice(2)
            }

            var val = dotToRef(key, data);

            if ($.isFunction(val)) {
                val = val.call(data);
            }

            if (!val && 0 !== val) {
                val = "";
            }

            // ignore the default behavior of escaping HTML entities when an
            // ampersand flag is provided.
            if ("&" === flag) {
                return val;
            }

            return val.replace(regEscapeCharacters, escapeCharacters);
        };

        while (templateIndex < templateLength) {

            var matches = regLine.exec(template[templateIndex++]);
            var tagName = matches[2];
            var partialName = matches[3];
            var postTag = matches[5];
            var el = false;
            var $el = false;
            var classes = [];

            // The amount of white space that starts the string
            // defines its depth in the DOM tree
            // Four spaces to a level, add one to compensate for
            // the quote character then floor the value
            // examples
            //  "tag"        : 0 spaces = 0
            //  "   tag"     : 3 spaces = 1
            //  "       tag" : 7 spaces = 2
            var depth = ((matches[1].length + 1) / 4) | 0;

            // Make sure there is at least a tag, partial or postTag declared
            // basically, skip empty lines
            if (!tagName && !postTag) {
                continue;
            }

            if (partialName) {
                // call the partial function with clean arguments
                el = dotToRef(partialName, partials)
                    .apply(partials, $.map(matches[4].split(","), $.trim));

                // allow partials to return falsy values and have this line in the template skipped
                // useful for partials that implement conditional logic
                if (!el) {
                    continue;
                }

                // If a jQuery object is returned with multiple items,
                // the whole object can be cached, but only the first
                // item is used in the object that is returned from this plugin
                if (el instanceof $) {
                    $el = el;
                    el = el[0];
                }
            }

            // Ensure we have a proper ELEMENT_NODE in our el variable
            if (!el || el.nodeType !== 1) {
                // Create the element, default to div if not declared
                el = document.createElement(tagName || "div");
            }

            if (depth && parentEl) {
                if (depth > lastDepth) { // nest in last element
                    parentEl = lastEl;
                }

                while (depth < lastDepth--) { // traverse up
                    parentEl = parentEl.parentNode;
                }

                parentEl.appendChild(el);
            } else {
                ret.push(parentEl = el);
            }

            lastDepth = depth;
            lastEl = el;

            // Don't bother with the rest if there's no mods or text
            if (!postTag) {
                continue;
            }

            // Search for attributes
            // Attach them to the element and remove the characters
            // from the postTag string, this allows us to have spaces in the attr values
            //
            // input[placeholder=Hello World] - <input placeholder="Hello World" />
            // input[disabled]                - <input disabled />
            postTag = postTag.replace(regAttributes, function(match, attr, val) {
                el.setAttribute(attr, val || "");
                return "";
            });

            // Look for text content after the mods via a space character
            indexOfSpace = postTag.indexOf(" ");

            if (indexOfSpace !== -1) {
                // Strip everything after the first space to use it as the text
                // value and run it through the replace func to replace variables
                textVal = postTag.substr(indexOfSpace + 1)
                    .replace(regVariables, varReplacer);

                // Remove the text from the postTag so that only mods remain
                postTag = postTag.substr(0, indexOfSpace);

                // Set the value for the tags we want to,
                // otherwise set innerHTML
                if ($.inArray(el.tagName.toLowerCase(), setValuesFor) < 0) {
                    el.innerHTML = textVal;
                } else {
                    el.value = textVal;
                }
            }

            // Loop the mods
            while ((matches = regModifiers.exec(postTag))) {
                modVal = matches[2];

                switch (matches[1]) {
                    case ".": // Add class
                        classes.push(modVal);
                        break;

                    case "#": // Set id
                        el.id = modVal;
                        break;

                    case "$": // cache jQueryized element for later
                        objCache[modVal] = $el || $(el);
                }
            }

            // Add any classes a partial may have added to the classes list
            if (el.className) {
                classes.push(el.className);
            }

            // Attach all the classes at once
            if (classes.length) {
                el.className = classes.join(" ");
            }
        }

        // Alias the object cache as "cache" and "c"
        ret.c = ret.cache = objCache;

        return ret;
    };

    tmpl.version = version;

    // Add as a jQuery plugin
    $.tmpl = tmpl;

    $.fn.tmpl = function(template, data, partials) {

        var self = this;
        var cache = self.c = self.cache = self.c || {};
        var compiled;
        var key;

        return self.each(function() {
            compiled = tmpl(template, data, partials);
            $(this).append(compiled);

            for (key in compiled.c) {
                if (cache[key]) {
                    cache[key].push(compiled.c[key][0]);
                } else {
                    cache[key] = compiled.c[key];
                }
            }
        });
    };

})(jQuery);