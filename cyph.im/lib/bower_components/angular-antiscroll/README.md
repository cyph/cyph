Use [antiscroll](https://github.com/LearnBoost/antiscroll) in Angular way. 

# What

this is an Angular Directive of antiscroll. It could be called by angular way.

==================
# Dependency:
1. [jQuery](http://github.com/jquery/query)
2. [jquery-mousewheel](https://github.com/brandonaaron/jquery-mousewheel)
3. [Angular](http://angularjs.org/)
4. [Antiscroll](https://github.com/LearnBoost/antiscroll)

# Usage:
1. ```bower install angular-antiscroll```

2. include file ```antiscroll.css```

```html
    <!-- include dependency -->
    <script src="bower_components/jquery-mousewheel.js"></script>
    <script src="bower_components/antiscroll/antiscroll.js"></script>
    <script src="bower_components/antiscroll/angular-antiscroll.js"></script>
    <!-- include css-->
    <link href="bower_components/antiscroll/antiscroll.css" rel="stylesheet" />
```

3. include "antiscroll" module in your app.

```javascript
    var App = angular.module('app', ['antiscroll']);
```

4. add antiscroll attribute in element which you want to use antiscroll. use ";" to seperate each option.

```html
    <table antiscroll="autoHide:false">
```

# LICENSE

Followed as <https://github.com/LearnBoost/antiscroll>

The MIT License (MIT)

Copyright (c) 2013 Bingo Yang

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
