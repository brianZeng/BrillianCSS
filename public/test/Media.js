/**
 * Created by 柏然 on 2014/11/23.
 */
describe('MediaQuery Behaviors', function () {
  var src, scope, sheet, media,color=ChangeSS.Color;
 function stringEqual(str1,str2,ignoreRex){
   ignoreRex=ignoreRex||/[^\S]/g;
   expect(str1.replace(ignoreRex,'')).toBe(str2.replace(ignoreRex,''))
 }
  function stringContain(str1,str2,ignoreRex){
    ignoreRex=ignoreRex||/[^\S]/g;
    expect(str1.replace(ignoreRex,'').indexOf(str2.replace(ignoreRex,''))>-1).toBe(true);
  }
  function getFirstScope(src) {
    return scope = (sheet=ChangeSS.parse(src)[0]).validate().scopes[0];
  }

  function getFirstSheet(src) {
    return sheet = ChangeSS.parse(src)[0].validate();
  }

  function getFirstMedia(src) {
    scope = getFirstScope(src);
    return media = scope.spec;
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
       expect(media.toString()).toBe("@media aural and (device-aspect-ratio:16/9) and (max-weight:3kg) and (color) and (min-width:600px)");
    });
    it('support multiple query',function(){
       src='@media not screen and (color), projection and (max-weight: 3kg){p{}}';
      getFirstMedia(src);
      expect(media.mediaTypes).toEqual(['not screen','projection']);
      expect(media.toString()).toBe('@media not screen and (color),projection and (max-weight:3kg)')
    });
    it('support query with defValue',function(){
      src='@media screen ($color:red){ div{} }';
      getFirstMedia(src);
      expect(scope.defValues).toEqual({$color:color('red')});
      src='@media screen and (max-weight:3kg) ($color:red){ div{} }';
      getFirstMedia(src);
      expect(scope.defValues).toEqual({$color:color('red')});
      expect(scope.spec.toString()).toEqual('@media screen and (max-weight:3kg)');
    });
    it('media condition can be treated as var using @treatas',function(){
      src='@media screen and (max-width:480px) @treatas $iphone{div{}}';
      getFirstMedia(src);
      expect(media.symbol).toBe('$iphone');
      expect(sheet.medias.$iphone).toBe(media);
      src='@media all and (min-width:960px) @treatas $large;';
      getFirstSheet(src);
      expect(sheet.medias.$large.toString()).toBe('@media all and (min-width:960px)');

    });
    it('scope rules can refer media via var symbol',function(){
      src='div{' +
      'color:red;' +
      ' @media $iphone{' +
      '   color:blue;' +
      '}}';
      getFirstScope(src);
      expect(scope.nested[0].spec.symbol).toBe(('$iphone'));
      stringEqual(sheet.toString(),'div{color:#;}'.replace('#',color('red')+''));
      src+='@media screen and (max-width:480px) @treatas $iphone;';
      getFirstSheet(src);
      expect(Object.keys(sheet.resolve()).length).toBe(2);
      var r=sheet.toString();
      stringContain(r,'@media screen and (max-width:480px){ div{ color:#;}}'.replace('#',color('blue')));
      stringContain(r,'div{color:#;}'.replace('#',color('blue')));
    });
  });
  describe('b.MediaQuery object attach to relative styles', function () {
    it('MediaQuery only nest styles', function () {
      src = '@media screen{  div{ color:red; }  }';
      scope = getFirstScope(src);
      expect(scope.spec.clone()).toEqual(new ChangeSS.MediaQuery('screen'));
      src = '@media screen{ $a:1px;  }';
      expect(function () {
        getFirstScope(src)
      }).toThrow();
    });
    it('styles are nested in mediaQuery scope', function () {
      src = '@media screen{  div{ color:red; } p{} }';
      getFirstScope(src);
      expect(scope.nested.length).toBe(2);
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
    });
    it('but support @media $var as nested',function(){
      src='div{' +
      '@media $iphone{}' +
      '@media $ipad{}'+
      ' p{' +
      '@media $iphone{}' +
      '}' +
      '}';
      getFirstScope(src);
      expect(scope.nested.length).toBe(3);
      expect(scope.nested[2].nested.length).toBe(1);
    });
    it('@media $var can also be a scope',function(){
      src='@media screen and (max-width: 480px) @treatas $iphone;' +
      '@media $iphone{' +
      '   div{ color:blue;}}';
      getFirstScope(src);
      expect(sheet.medias['$iphone'].toString()).toBe('@media screen and (max-width:480px)');
      expect(scope.nested[0].selector).toBe('div');
    })
  });
  describe('c.MediaQuery resolve :', function () {
    it('it support vars', function () {
      src = '@media all and (min-width:$m1) and (max-width:960px){div{}}';
      getFirstMedia(src);
      expect(media.resolve({$m1: '600px'})).toEqual('@media all and (min-width:600px) and (max-width:960px)');
    });
    it('returns clone() if can not be resolved', function () {
      src = '@media (min-width:$x){div{}};';
      getFirstMedia(src);
      expect(media.resolve()).toEqual(media.clone());
    });
  });
  describe('d.Sheet Contains MediaQuery resolve:',function(){
    beforeEach(function(){
      ChangeSS.opt.keepEmptyResult=true;
    });
    afterEach(function(){
      ChangeSS.opt.keepEmptyResult=false;
    });
    it('separate sheets by MediaQuery',function(){
      var r;
      src='div{} @media screen and (min-width:960px){ p{} }';
      getFirstSheet(src);
      expect((r=Object.getOwnPropertyNames(sheet.resolve())).length).toBe(2);
      expect(r).toContain('*');
      expect(r).toContain('@media screen and (min-width:960px){*}');
    });
    it('ignore scopes with unresolved MediaQuery',function(){
      src='div{} @media screen and (min-width:960px){ p{} } @media screen and (max-width:$unknown){ p{} }';
      getFirstSheet(src);
      expect(Object.getOwnPropertyNames(sheet.resolve()).length).toBe(2);
    });
    it('use toString($vars) method to get results',function(){
      src='$mm:960px;@media screen and (min-width:$mm){ p{ font-size:1.5em;} }';
      getFirstSheet(src);
      var r=sheet.toString();
      expect(r.indexOf('@media screen and (min-width:960px)')).toBe(0);
      stringContain(r,'{ p{ font-size:1.5em;} }');
    });
  })

});
