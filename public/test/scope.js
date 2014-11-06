/**
 * Created by 柏然 on 2014/11/4.
 */

describe('Scope static behaviors', function () {
  function getFirstScope(src) {
    return ChangeSS.parse(src)[0].validate().scopes[0];
  }

  function getObjLength(obj) {
    return Object.getOwnPropertyNames(obj).length;
  }

  function getFirstSheet(src) {
    return ChangeSS.parse(src)[0];
  }

  function objForEach(obj, callback, thisObj, arg) {
    thisObj = thisObj || obj;
    if (typeof obj == "object" && obj)
      for (var i = 0, keys = Object.getOwnPropertyNames(obj), key = keys[0]; key !== undefined; key = keys[++i])
        callback.apply(thisObj, [key, obj[key], arg]);
    return thisObj;
  }

  describe('scope components', function () {
    var rules = {
      padding: '10px',
      background: 'red',
      border: '1px dashed orange',
      transform: 'rotate(30deg)'
    }, r = [], src;
    objForEach(rules, function (key, value) {
      r.push(key + ':' + value + ';');
    });
    src = 'div{' + r.join('') + '}';
    it('scope resolves static rules as they are input', function () {
      var scope = ChangeSS(src)[0].scopes[0];
      console.log(scope.resolve());
      expect(scope.staticRules).toEqual(rules);
    });
    it('when a rule contains Var it becomes a dynamic rule', function () {
      var src = 'table{' +
        'width:$contentWidth;' +
        'height:$contentWidth/2+2*2px;' +
        'position:relative;' +
        'border:$borderWidth dashed $borderColor;' +
        'font:14px solid $fontFamily' +
        '}', scope = getFirstScope(src);
      expect(getObjLength(scope.dynamicRules)).toBe(4);
    });
    it('a scope can hold default values', function () {
      var src = 'canvas($width:512px*2,$color:rgb(0,123,0),' +
        '$border:1 solid black,$display:inline-block,$height:$width){}', scope = getFirstScope(src);
      expect(scope.defValues).toEqual({
        "$width": Length('1024px'),
        "$color": 'rgb(0,123,0)',
        "$border": List(Length(1), 'solid black'),
        "$display": 'inline-block',
        "$height": Var('$width')
      });
      src = src.replace('{}', '{&:hover($border:2px solid $hoverColor){}}');
      scope = getFirstScope(src).nested[0];
      expect(scope.defValues).toEqual({
        '$border': List(Length('2px'), 'solid', Var('$hoverColor'))
      });

      //expect(scope.clone()).toEqual(scope);
    });
  });
  describe('nesting support', function () {
    it('a scope can nest many scopes', function () {
      var src = 'form{' +
        ' &:hover{}' +
        ' &::after{}' +
        ' >input{}' +
        ' input[name="o"]{}' +
        '}';
      var scope = ChangeSS.parse(src)[0].scopes[0];
      expect(scope.nested.length).toBe(4);
      console.log(scope.nested.map(function (s) {
        return s.selector;
      }));
    });
    it('a scope can also nest very deep', function () {
      var src = 'div{div{p{span{strong{.deep{#verydeep{}}}}}}}';
      var scope = ChangeSS.parse(src)[0].scopes[0], r;
      expect((r = scope.resolve()).length).toBe(7);
      console.log(r.map(function (s) {
        return s.selector;
      }));
    });
    it('scope combines selectors,replace its nested & with its selectors', function () {
      var src = 'code,pre{p,span{b,a{}}}';
      var scope = getFirstScope(src), r;
      expect((r = scope.resolve())[0].selector.split(',').length).toBe(2);
      expect(r[1].selector.split(',').length).toBe(4);
      expect(r[2].selector.split(',').length).toBe(8);
      src = 'ul{&:hover{}}';
      scope = getFirstScope(src);
      expect(scope.resolve()[1].selector).toBe('ul:hover');
      src = 'ul,li{&:hover{}}';
      scope = getFirstScope(src);
      expect(scope.resolve()[1].selector).toBe('ul:hover,li:hover');
    });
  });

});
describe('scope resolve behaviors', function () {
  function getFirstScope(src) {
    return ChangeSS.parse(src)[0].validate().scopes[0];
  }

  function getObjLength(obj) {
    return Object.getOwnPropertyNames(obj).length;
  }

  function getFirstSheet(src) {
    return ChangeSS.parse(src)[0];
  }

  var src = 'canvas($height:$width*2,$width:512px){}', scope, sheet;
  describe('scope resolves without param use its default var values:', function () {
    it('1.vars are lazy eval.if no var provided,ignore the dynamic rule and log in console   ', function () {
      scope = getFirstScope(src.replace('{}', '{width:$width;height:$height;}'));
      expect(scope.resolve()[0].rules).toEqual({width: Length('512px'), height: Length('1024px')});
      scope = getFirstScope(src.replace('{}', '{width:$abc}'));
      spyOn(console, 'log');
      expect(scope.resolve()[0].rules).toEqual({});
      if (ChangeSS.traceLog)
        expect(console.log).toHaveBeenCalled();
    });
    it('2.a nested scope can inherit its nearest parent vars', function () {
      scope = getFirstScope(src.replace('{}', '{ a{width:$width;height:$height;}}'));
      expect(scope.resolve()[1].rules).toEqual({width: Length('512px'), height: Length('1024px')});
      scope = getFirstScope(src.replace('{}', '{ a($width:5px){width:$width;height:$height;}}'));
      expect(scope.resolve()[1].rules).toEqual({width: Length('5px'), height: Length('10px')});
      scope = getFirstScope(src.replace('{}', '{ a($height:100px){width:$width;height:$height;}}'));
      expect(scope.resolve()[1].rules).toEqual({width: Length('512px'), height: Length('100px')});
      scope = getFirstScope(src.replace('{}', '{ a($width:5px){b{width:$width;}}}'));
      expect(scope.resolve()[2].rules).toEqual({width: Length('5px')});
    });
  });
  describe('scope resolves with param use its default var values:', function () {
    it('vars belong to a sheet have higher priority over scope vars in this sheet', function () {
      sheet = getFirstSheet(src.replace('{}', '{width:$width;height:$height;}$width:21px;'));
      expect(sheet.resolve()[0].rules).toEqual({width: Length('21px'), height: Length('42px')});
      sheet = getFirstSheet(src.replace('{}', '{width:$width;height:$height;}$height:21px;'));
      expect(sheet.resolve()[0].rules).toEqual({width: Length('512px'), height: Length('21px')});
    });
    it('if assign values when invoke resolve($assign),$assign has highest priority', function () {
      sheet = getFirstSheet(src.replace('{}', '{width:$width;height:$height;}$width:21px;'));
      expect(sheet.resolve({'$width': Length(101)})[0].rules).toEqual({width: Length('101'), height: Length('202')});
    });
  })

});