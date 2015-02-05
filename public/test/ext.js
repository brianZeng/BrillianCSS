/**
 * Created by 柏然 on 2014/11/6.
 */
describe('extension behaviors:', function () {
  var src, sheet, scope;

  function getFirstValidatedSheet(src) {
    scope = (sheet = ChangeSS.compile(src)[0]).scopes[0];
    return sheet;
  }

  function containAll(results) {
    for (var i = 1, len = arguments.length; i < len; i++)
      expect(results).toContain(arguments[i]);
  }

  function getSheetSelectors(sheet, array) {
    array = array || [];
    var scopes = sheet.scopes || sheet.nested;
    scopes.forEach(function (s) {
      array.push(s.selector);
      getSheetSelectors(s, array)
    });
    return array;
  }

  describe('1.inherit selectors:', function () {
    var ss, selectors;
    beforeEach(function () {
      ChangeSS.opt.keepEmptyResult = true;
    });
    afterEach(function () {
      ChangeSS.opt.keepEmptyResult = false;
    });
    it('a.combines base selectors with super selectors', function () {
      src = '.base{}.super{@extend .base;}';
      getFirstValidatedSheet(src);

      containAll(ss = getSheetSelectors(sheet), '.base,.super', '.super');
      expect(ss.length).toBe(2);
    });
    it('b.can handle nested inherits', function () {
      src = '.base{} div{>p{@extend .base;}}';
      getFirstValidatedSheet(src);
      containAll(ss = getSheetSelectors(sheet), '.base,div >p', 'div', 'div >p');
      expect(ss.length).toBe(3);
    });
    it('c.can handle pseudo inherits', function () {
      src = '.base{} a{&:hover{@extend .base;}}';
      getFirstValidatedSheet(src);
      containAll(ss = getSheetSelectors(sheet), '.base,a:hover', 'a', 'a:hover');
      expect(ss.length).toBe(3);
    });
    it('d.can handle complex inherits', function () {
      src = '.a{} .b{@extend .a} .c{@extend .a} .d{@extend .b} .m{} .n{} .k{@extend .m; @extend .n}';
      getFirstValidatedSheet(src);
      containAll(ss = getSheetSelectors(sheet), '.a,.c,.b,.d', '.b,.d', '.c', '.d', '.m,.k', '.n,.k', '.k');
      expect(ss.length).toBe(7);
    });
    it('e.can detect cyclic inherits', function () {
      src = '.a{@extend .c} .b{@extend .a} .c{@extend .b}';
      var spy = spyOn(ChangeSS.error, 'cyclicInherit');
      getFirstValidatedSheet(src);
      expect(spy).toHaveBeenCalled();
      src = '.a{@extend .a}';
      getFirstValidatedSheet(src);
      expect(spy).toHaveBeenCalled();
    });
    it('f.report undefined class', function () {
      src = '.a{@extend .doNotExist}';
      var spy = spyOn(ChangeSS.error, 'notExist');
      getFirstValidatedSheet(src);
      expect(spy).toHaveBeenCalled();
    })
  });
  describe('2.mix obj', function () {
    it('mix obj in local sheet', function () {
      src = '@mixin $redBorder{border:1px solid red;&:hover{ border-color:yellow;}} div{@include $redBorder;}';
      getFirstValidatedSheet(src);
      expect(sheet.mixins['$redBorder']).toEqual(jasmine.any(ChangeSS.Scope));
      expect((scope = sheet.scopes[0]).includes['$redBorder->' + sheet.name]).toEqual(jasmine.any(Object));
      scope.resolve({}, sheet);
    });
    it('mix obj can include another obj', function () {
      src = '@mixin $a{};@mixin $b{@include $a;}';
      getFirstValidatedSheet(src);
      expect(sheet.mixins['$a']).toEqual(jasmine.any(ChangeSS.Scope));
      expect(sheet.mixins['$b']).toEqual(jasmine.any(ChangeSS.Scope));
    });
    it('detect cyclic includes', function () {
      src = '@mixin $a{@include $b;} @mixin $b{@include $c;} @mixin $c{@include $a;} .circle{@include $a;}';
      expect(function () {
        getFirstValidatedSheet(src);
      }).toThrowError();
      var spy = spyOn(ChangeSS.error, 'cyclicInherit');
      getFirstValidatedSheet(src);
      expect(spy).toHaveBeenCalled();
    });
    it('what the mixObj extends will also be include', function () {
      src = '@mixin $a{@extend .base} .base{} .super{@include $a;}';
      getFirstValidatedSheet(src);
      containAll(sheet.get('.super').exts, '.base->default');
      src = '@mixin $a{@extend .base} .base{@extend .error;} .super{@include $a;} .error{@include $a}';
      var spy = spyOn(ChangeSS.error, 'cyclicInherit').and.callThrough();
      expect(function () {
        getFirstValidatedSheet(src);
      }).toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

});