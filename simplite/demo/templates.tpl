{{ -- tpl:table-tpl -- }}
<table>
    <head class="aaa">
        <tr>
            <th class="{{/**alert(1212);*/_this.name}}  {{_this.gender}} <%

            if (true) {%>aaa<%}%>">/**sdfs*/姓名</th>
            <th>性别</th>
            <th>switch条件：<%
                    switch (new Date().getTime() % 2) {
                        case 0:
                %>
                            000000
                <%
                            break;
                        case 1:
                %>
                            111111
                <%
                            break;
                        default:
                            break;
                    }
                %></th>
        </tr>
    </head>
    <body>
        <tr>
            <td>
                {{ _this.name.replace(/t/g, '@') }}      a{{_this.name}}{{# filter('abc', _this.name)}}
            </td>
            <td>{{_this.gender}}</td>
            <td>{{_this.age}}<% include('sub-index-tpl', _this.c); %></td>
        </tr>
    </body>
</table>
<% include('test-tpl') %>
{{ -- /tpl -- }}

{{ -- tpl:sub-index-tpl -- }}
<div>aa!!{{ _this.name }}</div>
<%
    var a = "aaaa";
%>
<div>
    <div>{{_this.name}}</div>
    <div>{{_this.gender}}</div>
    <div>{{_this.age}}</div>
    <div>{{a}}</div>
</div>
其他子name：<% include('test-tpl') %>
{{ -- /tpl -- }}

{{ -- tpl:test-tpl -- }}
<div class="aaaa">test-tpl</div>
<%
    include('test');
%>

{{ -- /tpl -- }}

{{ --tpl: test -- }}
测试多层传递：{{ _this.name }}ss
<%
    var aaa = 'sd"as""f"';

    //alert(aaa);

%>
{{ --/tpl--}}