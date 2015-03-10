/**
 * Created by 柏然 on 2014/11/4.
 */

describe('Scope static behaviors', function () {
  function getFirstScope(src) {
    return ChangeSS.parse(src)[0].scopes[0];
  }

  function getObjLength(obj) {
    return Object.getOwnPropertyNames(obj).length;
  }

  function containAll(results) {
    for (var i = 1, len = arguments.length; i < len; i++)
      expect(results).toContain(arguments[i]);
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

  describe('1.scope components:', function () {
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
      var scope = ChangeSS.compile(src)[0].scopes[0];
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
      var src = 'canvas($width:512px*2;$color:rgb(0,123,0);' +
        '       $border:1 solid black;$display:inline-block;$height:$width){}', scope = getFirstScope(src);

      var toEuqalObj={
        "$width": Length('1024px'),
        "$color": ChangeSS.Color([0,123,0]),
        "$border": List(Length(1), 'solid black'),
        "$display": 'inline-block',
        "$height": Var('$width',ChangeSS.opt.defaultSheetName)
      };
      Object.getOwnPropertyNames(scope.defValues).forEach(function(key){
        expect(scope.defValues[key]).toEqual(toEuqalObj[key]);
      });
      src = src.replace('{}', '{&:hover($border:2px solid $hoverColor){}}');
      scope = getFirstScope(src).nested[0];
      expect(scope.defValues).toEqual({
        '$border': List(Length('2px'), 'solid', Var('$hoverColor'))
      });

      //expect(scope.clone()).toEqual(scope);
    });
  });
  describe('2.nesting support:', function () {
    it('a scope can nest many scopes', function () {
      var src = 'form{' +
        ' &:hover{}' +
        ' &::after{}' +
        ' >input{}' +
        ' input[name="o"]{}' +
        '}';
      //src='form{ &:hover{}}';
      var scope =getFirstSheet(src).scopes[0];
      expect(scope.nested.length).toBe(4);
    });
    it('a scope can also nest very deep', function () {
      var src = 'div{div{p{span{strong{.deep{#verydeep{color:red}}}}}}}';
      var scope = ChangeSS.parse(src)[0].scopes[0], r;
      expect((r = scope.resolve()[0].selector.split(' ')).length).toBe(7);

    });
    it('scope combines selectors,replace its nested & with its selectors', function () {
      var src = 'code,pre{p,span{b,a{}}}';
      ChangeSS.opt.keepEmptyResult = true;
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
      ChangeSS.opt.keepEmptyResult = false;
    });
  });
  describe('3.multiple sheets(I call it namespace)', function () {
    var sheets, src;

    function getSheets() {
      return sheets = ChangeSS.compile(src);
    }

    it('can be separeted by @sheetname,@sheetname must be the first line of the sheet', function () {
      src = '@sheetname foo;$color:red;' +
        '@sheetname bar;$color:blue;' +
        '@sheetname bar_bar;$color:yellow;' ;
      expect(getSheets().length).toBe(3);
      containAll(sheets.map(function (sheet) {
        return sheet.name
      }), 'foo', 'bar', 'bar_bar');
    });
    it('the default sheet name is ChangeSS.opt.defaultSheetName', function () {
      src = '@sheetname default;$color:red;'+
        '@sheetname bar;$color:blue;';
      expect(getSheets().length).toBe(2);
      expect(sheets.map(function (sheet) {
        return sheet.name
      })).toEqual(['default', 'bar']);
      expect(sheets.map(function (sheet) {
        return sheet.get('$color')
      })).toEqual(['red', 'blue']);
    });
    it('cannot assign a value or mixin to another sheet var', function () {
      src = '@sheetname foo;$color:red;' +
        '@sheetname bar;$color:blue;' +
        '$color->foo:white;';
      debugger;
      expect(getSheets().length).toBe(2);
      expect(sheets.map(function (sheet) {
        return sheet.get('$color')
      })).toEqual(['white', 'blue']);
      src = '@sheetname foo;$color:red;' +
        '@sheetname bar;$color:blue;' +
        '$color->bar:#000;';
      getSheets();
      expect(sheets.map(function (sheet) {
        return sheet.get('$color').toString()
      })).toEqual(['red',ChangeSS.Color('#000')+'']);
      src = '@sheetname bar;' +
        'div{}' +
        '@sheetname foo;' +
        '@mixin $error -> bar ($a:red){width:20px;}';
      expect(getSheets()[0].get('$error', 'mixin').staticRules).toEqual({width: '20px'});
      expect(getSheets()[0].get('$error', 'mixin').defValues).toEqual({'$a': 'red'});
    });
    it('cannot assign a scope to another sheet,because ....', function () {
      src = '@sheetname bar;' +
        'div{}' +
        '@sheetname foo;' +
        '.error -> bar{width:20px;}';
      expect(getSheets()[1].scopes[0].selector).toBe('.error -> bar');
    });
    it('but can include or extend from other sheets', function () {
      src = '@sheetname lib;' +
        '$color:red;' +
        '@mixin $dash{border:1px dashed #123};' +
        '.auto{width:100%}' +
        '$colorRef:$color->lib;' +
        '@sheetname default; div{' +
        'background:$color ->lib;' +
        '@include $dash  -> lib;' +
        '@extend .auto ->  lib;' +
        '}';
      var lib = getSheets()[0], def = sheets[1];
      containAll(ChangeSS.get('default').scopes.map(function (s) {
        return s.selector
      }), 'div', '.auto,div');
      expect(def.scopes[0].includes).toEqual(jasmine.objectContaining({'$dash->lib': {}}))
    });
  });
  describe('4.validate Selector',function(){
    var src='div{p{.mo &{}}}';
    var scope=getFirstScope(src),child=scope.nested[0],grandchild=child.nested[0];
    it('only validate onece',function(){
      expect(child.selector).toBe('div p');
      expect(grandchild.selector).toBe('.mo div p');
      scope.validateSelector();
      expect(child.selector).toBe('div p');
      expect(grandchild.selector).toBe('.mo div p');
    });
    it('restore selector when backtracked',function(){
      scope.backtraceSelector();
      expect(child.selector).toBe('p');
      expect(grandchild.selector).toBe('.mo &');
    })

  });
});
