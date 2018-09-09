# Simplite
========
## Simplite是一个超轻量的js模板引擎，支持node服务器端和浏览器端。
- 特点：
    - 1：代码量少，学习成本低；
    - 2：默认jsp语法标签方式，熟悉jsp的朋友可以直接按照jsp的语法书写模板；
    - 3：使用原生js语法进行逻辑处理，只要熟悉js语法即可直接上手，没有学习成本。
    - 4：支持原生js的所有语法作为代码逻辑片段，支持宽泛的书写格式。
    - 5：支持重定义模板语言的标签符，默认的逻辑标签为<%和%>，默认的属性标签为<%=和%>。
    - 6：支持嵌套子模板，子模板默认（没有传递数据参数）是共享父模板数据，可以通过传参设置子模板使用的数据集。
    - 7：支持动态导入模板与嵌入多个模板，只要导入的模板不是循环依赖的模板都能正常处理。
    - 8：支持子模板使用Simplite.dataKey指定的字段访问传递过来的数据全集，默认值为"_this"，对于数组、数字这样的数据集来说，使用Simplite.dataKey很容易拿到数据。
    - 9：支持面向对象方式使用模板和纯静态函数方式来手动组织模板处理过程。
    - 10：支持除了访问父模板数据外，还可以提供方法作用域内任何数据为数据集，比如在全局有个arr，那么可以include(tmplt, arr)来指定。
    - 11：支持对数据进行过滤处理，使用关键字filter(name, datas...)方式进行调用，其中name为Simplite.addFilter(name, fun)的name注册的方法
    
- 使用说明：
    http://www.cnblogs.com/centre/p/4299198.html


[simplite-loader](https://github.com/zhangshaolong/simplite-loader "simplite loader")

[a webpack+es6+simplite+simplite-loader demo](https://github.com/zhangshaolong/scaffold "scaffold")

