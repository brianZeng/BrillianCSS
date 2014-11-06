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

  describe('1.inherit selectors:', function () {
    it('combines base selectors with super selectors', function () {
      src = '.base{}.super{@extend .base;}';
      var ss;
      getFirstValidatedSheet(src);
      expect(ss = getSheetSelectors(sheet)).toContain('.base,.super', '.super');
      expect(ss.length).toBe(2);
    })
  })

});