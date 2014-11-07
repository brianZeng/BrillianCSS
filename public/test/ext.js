/**
 * Created by 柏然 on 2014/11/6.
 */
describe('extension behaviors:', function () {
  var src, sheet;

  function getFirstValidatedSheet(src) {
    return sheet = ChangeSS(src)[0];
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

  xdescribe('1.inherit selectors:', function () {
    var ss, selectors;
    it('combines base selectors with super selectors', function () {
      src = '.base{}.super{@extend .base;}';
      getFirstValidatedSheet(src);
      expect(ss = getSheetSelectors(sheet)).toContain('.base,.super', '.super');
      expect(ss.length).toBe(2);
    });
    it('can handle nested inherits', function () {
      src = '.base{} div{>p{@extend .base;}}';
      getFirstValidatedSheet(src);
      expect(ss = getSheetSelectors(sheet)).toContain('.base,div >p', 'div', 'div >p');
      expect(ss.length).toBe(3);
    });
    it('can handle pseudo inherits', function () {
      src = '.base{} a{&:hover{@extend .base;}}';
      getFirstValidatedSheet(src);
      expect(ss = getSheetSelectors(sheet)).toContain('.base,a:hover', 'a', 'a:hover');
      expect(ss.length).toBe(3);
    });
    it('can handle complex inherits', function () {
      src = '.a{} .b{@extend .a} .c{@extend .a} .d{@extend .b} .m{} .n{} .k{@extend .m; @extend .n}';
      getFirstValidatedSheet(src);
      expect(ss = getSheetSelectors(sheet)).toContain('.a,.c,.b,.d', '.b,.d', '.c', '.d', '.m,.k', '.n,.k', '.k');
      expect(ss.length).toBe(7);
    });
    it('can detect cyclic inherits', function () {
      src = '.a{@extend .c} .b{@extend .a} .c{@extend .b}';
      var spy = spyOn(ChangeSS.error, 'cyclicInherit');
      getFirstValidatedSheet(src);
      expect(spy).toHaveBeenCalled();
      src = '.a{@extend .a}';
      getFirstValidatedSheet(src);
      expect(spy).toHaveBeenCalled();
    });
    it('report undefined class', function () {
      src = '.a{@extend .donothave}';
      var spy = spyOn(ChangeSS.error, 'notExist');
      getFirstValidatedSheet(src);
      expect(spy).toHaveBeenCalled();
    })
  });
  describe('2.mix obj', function () {
    var scope;
    xit('mix obj in local sheet', function () {
      src = '@mixin $redBorder{border:1px solid red;&:hover{ border-color:yellow;}} div{@include $redBorder;}';
      getFirstValidatedSheet(src);
      expect(sheet.mixins['$redBorder']).toEqual(jasmine.any(ChangeSS.Scope));
      expect((scope = sheet.scopes[0]).includes['$redBorder']).toEqual(jasmine.any(Object));
      scope.resolve({}, sheet);
    });
    xit('mix obj can include another obj', function () {
      src = '@mixin $a{} @mixin $b{@include $a;}';
      getFirstValidatedSheet(src);
      expect(sheet.mixins['$a']).toEqual(jasmine.any(ChangeSS.Scope));
      expect(sheet.mixins['$b']).toEqual(jasmine.any(ChangeSS.Scope));
    });

    it('detect cyclic includes', function () {
      src = '@mixin $a{@include $b;} @mixin $b{@include $c;} @mixin $c{@include $a;} .circle{@include $a;}';

      //var spy=spyOn(ChangeSS.error,'cyclicInherit');
      getFirstValidatedSheet(src);
      // expect(spy).toHaveBeenCalled();
    })

  });

});