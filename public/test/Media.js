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
  describe('a.Grammar test:',function(){
    it('support media query without media type',function(){
      src='@media (orientation: portrait) { div{}}';
      getFirstMedia(src);
      expect(media.toString()).toBe('@media (orientation:portrait)');
    });
    it('support multiple expression ',function(){
       src='@media aural and (device-aspect-ratio: @"16/9") and (max-weight: 3kg) and (color) and (min-width:600px){p{}}';
       getFirstMedia(src);
       expect(media.toString()).toBe("@media aural and(device-aspect-ratio:16/9)and(max-weight:3kg)and(color)and(min-width:600px)");
    });
    it('support multiple query',function(){
       src='@media not screen and (color), projection and (max-weight: 3kg){p{}}';
      getFirstMedia(src);
      expect(media.mediaTypes).toEqual(['not screen','projection']);
      expect(media.toString()).toBe('@media not screen and(color),projection and(max-weight:3kg)')
    });
  });
  describe('b.MediaQuery object attach to relative styles', function () {
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
  describe('c.MediaQuery resolve :', function () {
    it('it support vars', function () {
      src = '@media all and (min-width:$m1) and (max-width:960px){div{}}';
      getFirstMedia(src);
      expect(media.resolve({$m1: '600px'})).toEqual('@media all and(min-width:600px)and(max-width:960px)');
    });
    it('returns clone() if can not be resolved', function () {
      src = '@media (min-width:$x){div{}};';
      getFirstMedia(src);
      expect(media.resolve()).toEqual(media.clone());
    });
  });

});