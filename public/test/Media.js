/**
 * Created by 柏然 on 2014/11/23.
 */
describe('MediaQuery Behaviors', function () {
  var src, scope, sheet, media;

  function getFirstScope(src) {
    return scope = ChangeSS.parse(src)[0].validate().scopes[0];
  }

  function getFirstSheet(src) {
    return sheet = ChangeSS.parse(src)[0].validate();
  }

  function getFirstMedia(src) {
    scope = getFirstScope(src);
    return media = scope.media;
  }

  describe('a.MediaQuery object attach to relative styles', function () {
    it('MediaQuery only nest styles', function () {
      src = '@media screen{  div{ color:red; }  }';
      scope = getFirstScope(src);
      expect(scope.media.clone()).toEqual(new ChangeSS.MediaQuery('screen'));
      src = '@media screen{ $a:1px;  }';
      expect(function () {
        getFirstScope(src)
      }).toThrow();
    });
    it('styles in the same block share a same MediaQuery instance', function () {
      src = '@media screen{  div{ color:red; } p{} }';
      sheet = getFirstSheet(src);
      expect(sheet.scopes[0].media).toBe(sheet.scopes[1].media);
    });
    it('not support nested mediaQuery', function () {
      src = 'div{ @media print{ div{} } }';
      expect(function () {
        getFirstScope(src)
      }).toThrow();
      src = '@media not print{ @media screen{ }  }';
      expect(function () {
        getFirstScope(src)
      }).toThrow();
    })
  });
  describe('b.MediaQuery resolve :', function () {
    it('it support vars', function () {
      src = '@media all(min-width:$m1) and (max-width:960px){div{}}';
      getFirstMedia(src);
      expect(media.resolve({$m1: '600px'})).toEqual('@media all(min-width:600px)and(max-width:960px)');
    });
    it('returns clone() if can not be resolved', function () {
      src = '@media (min-width:$x){div{}};';
      getFirstMedia(src);
      expect(media.resolve()).toEqual(media.clone());
    })
  });

});