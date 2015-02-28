// ´æµµ
var compile = function (html) {
    html = html.replace(/\s+/g, ' ');
    var charts = html.split('');
    var start = 0;
    for (var i = 0, len = charts.length; i < len; i++) {
        var ch = charts[i];
        if (ch === '<' && charts[i + 1] === '%') {
            var start = i;
            if (charts[i + 2] === '=') {
                var type = 'p';
                i = i + 2;
            } else {
                var type = 's';
                i = i + 1;
            }
        } else if (ch === '%' && charts[i + 1] === '>') {
            if (type === 'p') {
                charts.splice(start, 3, '"', '+');
                start = start - 1;
                i = i - 1;
                charts.splice(i, 2, '+', '"');
            } else {
                charts.splice(start, 2, '"', ';');
                charts.splice(i, 2, 'o', 'u', 't', '+', '=', '"');
                start = start + 4;
                i = i + 4;
            }
            i = i + 1;
        }
    }
    charts.unshift('var out="');
    charts.push('";return out;');
    return new Function ('_this', charts.join(''));
};