{{ -- tpl:table-tpl -- }}
<table>
    <head class="aaa">
        <tr>
            <th class="<%=/**alert(1212);*/_this.name%>        <%=_this.gender%> <% 

            if (true) {%>aaa<%}%>">/**sdfs*/姓名</th>
            <th>性别</th>
            <th>年龄</th>
        </tr>
    </head>
    <body>
        <tr>
            <td>
                <%= _this.name%>      a<%=_this.name%><%=# filter('abc', _this.name)%>
            </td>
            <td><%=_this.gender%></td>
            <td><%=_this.age%><% include('juhuixue-index-tpl', _this.c); %></td>
        </tr>
    </body>
</table>
<% include('test-tpl') %>
{{ -- /tpl -- }}

{{ -- tpl:juhuixue-index-tpl -- }}
<div>aa</div>
<%
    var a = "aaaa";
%>
<div>
    <div><%=_this.name%></div>
    <div><%=#_this.gender%></div>
    <div><%=_this.age%></div>
    <div><%=a%></div>
</div>
{{ -- /tpl -- }}

{{ -- tpl:test-tpl -- }}
<div class="aaaa">test-tpl</div>
<%
    include('test');
%>

{{ -- /tpl -- }}

{{ --tpl: test -- }}
<%
    var aaa = 'sd"as""f"';

    //alert(aaa);

%>
{{ --/tpl--}}