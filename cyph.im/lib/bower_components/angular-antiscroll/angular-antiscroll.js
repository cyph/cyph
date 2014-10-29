angular.module('antiscroll', [])
.directive('antiscroll', function(){
  return {
    restrict: 'A',
    scope: {},
    transclude: 'element',
    compile: function compile( tElement, tAttrs, transclude){
      return {
        post:function(scope){
          options = {};
          if(tAttrs.antiscroll){
            attrs = tAttrs.antiscroll.split(';');
            for(var i in attrs){
              v = attrs[i].split(':');
              options[v[0]] = v[1];
            }
          }
          scope.scroller = tElement.antiscroll(options).data('antiscroll');
        }
      }
    },
    template:
      ['<div class="box-wrap antiscroll-wrap">',
        '<div class="box">',
          '<div class="antiscroll-inner">',
            '<div class="box-inner" ng-transclude>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'].join(''),
    replace: true
  }
});
