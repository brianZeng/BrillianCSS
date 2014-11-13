/**
 * Created by 柏然 on 2014/11/12.
 */
describe('Parse Grammar', function () {
  function getFirstScope(src) {
    return ChangeSS.parse(src)[0].validate().scopes[0];
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

  var src, sheet, scope;
  describe('a.normal body rules', function () {
    it('1.can parse complex body', function () {
      src = 'input[type=range]{' +
        'background: -webkit-linear-gradient(left,#1d2e38 0%,#2b4254 50%,#2b4254 100%);' +
        '}';
      scope = getFirstScope(src);
      expect(scope.staticRules).toEqual({background: '-webkit-linear-gradient(left,#1d2e38 0%,#2b4254 50%,#2b4254 100%)'});
      src = 'input[type=range]{' +
        'background: 0px 2px 10px 0px black inset,1px 0px 2px rgba(0, 0, 0, 0.4) inset;}';
      scope = getFirstScope(src);
      expect(scope.staticRules).toEqual({background: '0px 2px 10px 0px black inset , 1px 0px 2px rgba(0,0,0,0.4) inset'});
      src = 'input($gradient:-webkit-gradient(linear, left top, right top, color-stop(0%,#1d2e38), color-stop(50%,#2b4254), color-stop(100%,#2b4254))){}';
      scope = getFirstScope(src);
      expect(scope.defValues['$gradient']).toBe('-webkit-gradient(linear,left top,right top,color-stop(0%,#1d2e38),color-stop(50%,#2b4254),color-stop(100%,#2b4254))');

    })

  })


});