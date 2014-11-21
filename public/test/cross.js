/**
 * Created by 柏然 on 2014/11/10.
 */
describe('cross sheet behaviors', function () {
  var src, scope, sheet;

  function getFirstScope(src) {
    return scope = ChangeSS.eval(src)[0].scopes[0];
  }

  function getFirstSheet(src) {
    return sheet = ChangeSS.eval(src)[0];
  }

  function containAll(results) {
    for (var i = 1, len = arguments.length; i < len; i++)
      expect(results).toContain(arguments[i]);
  }

  describe('a.resolve var in another sheet', function () {
    it('1.try best to find the defined value', function () {
      src = '@sheetname remote;' +
        '  $ref:$local;$local:blue;$trouble:$a->default;' +
        '  ====' +
        '  $a:$local-> remote;' +
        '  $b:$ref->remote;' +
        '  $jock:$trouble->remote;';
      getFirstSheet(src);
      sheet = ChangeSS.get('default');
      expect(ChangeSS.assign(sheet.vars).$resolved).toEqual({$a: 'blue', $b: 'blue', $jock: 'blue'});
    });
    it('2.the resolve($param) can be a bridge to another var', function () {
      src = '@sheetname remote;' +
        '  $ref:red;' +
        '====' +
        '  $a:$bridge;a{color:$a;}';
      getFirstSheet(src);
      sheet = ChangeSS.get('default');
      expect(sheet.resolve({$bridge: ChangeSS.Var('$ref', 'remote')})[0].rules).toEqual({color: 'red'});
      expect(sheet.resolve().length).toEqual(0);
    });
  });
  describe('b.include from another sheet', function () {
    it('1.when included into another sheet, the vars in the mixobj sheet have no side-effect', function () {
      src = '@mixin $box($width:10px){width:$width;box-sizing:border-box;};$width:10px;' +
        '====@sheetname a;' +
        'div{@include $box->default($width:20px);}';
      getFirstSheet(src);
      sheet = ChangeSS.get('a');
      expect(sheet.resolve({$bridge: ChangeSS.Var('$ref', 'remote')})[0].rules).toEqual({width: '20px', 'box-sizing': 'border-box'});
      src = '@mixin $box($width:10px){width:$width;box-sizing:border-box;};$width:10px;' +
        '====@sheetname a;' +
        'div{@include $box->default($width:$width);};$width:35px;';
      getFirstSheet(src);
      sheet = ChangeSS.get('a');
      expect(sheet.resolve({$bridge: ChangeSS.Var('$ref', 'remote')})[0].rules).toEqual({width: '35px', 'box-sizing': 'border-box'});
    });
    it('2.when a scope include a mixobj from another sheet, clone the extends of the mixobj from another sheet', function () {
      src = '@sheetname inh;.borderBox{box-sizing:border-box;} @mixin $box{@extend .borderBox;}====' +
        'div{@include $box->inh;}';
      var selectors;
      getFirstSheet(src);
      ChangeSS.get('default').resolve();
      sheet = ChangeSS.get('default');
      selectors = sheet.resolve().map(function (s) {
        return s.selector;
      });
      containAll(selectors, 'div', '.borderBox,div');
    });
  });
  describe('c.extends style in another sheet', function () {
    it('1.when extends from another sheet', function () {
      src = '@sheetname remote; .base{}' +
        '====' +
        '  div{@extend .base->remote;}';
      var selectors;
      getFirstSheet(src);
      ChangeSS.get('default').resolve();
      sheet = ChangeSS.get('default');
      selectors = sheet.resolve().map(function (s) {
        return s.selector;
      });
      containAll(selectors, 'div', '.base,div');
    });

  });

});