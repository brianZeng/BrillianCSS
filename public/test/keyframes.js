/**
 * Created by 柏然 on 2014/12/2.
 */
describe('KeyFrames Behaviors',function(){
  var src, scope, sheet, media;
  function stringEqual(str1,str2,ignoreRex){
    ignoreRex=ignoreRex||/[^\S]/g;
    expect(str1.replace(ignoreRex,'')).toBe(str2.replace(ignoreRex,''))
  }
  function stringContain(str1,str2,ignoreRex){
    ignoreRex=ignoreRex||/[^\S]+/g;
    expect(str1.replace(ignoreRex,' ').indexOf(str2.replace(ignoreRex,' '))>-1).toBe(true);
  }
  function getFirstScope(src) {
    return scope = ChangeSS.parse(src)[0].validate().scopes[0];
  }

  function getFirstSheet(src) {
    return sheet = ChangeSS.parse(src)[0].validate();
  }
  function firstKeyFramesIdToBe(id){
    getFirstScope(src);
    expect(scope.nested[0].selector).toBe(id);
  }
  function getFirstMedia(src) {
    scope = getFirstScope(src.replace('{}','{0%{}}'));
    return media = scope.spec;
  }
  describe('a.grammar test:',function(){
    it('support @keyframes',function(){
      src='@keyframes ani{}';
      getFirstMedia(src);
      expect(media.toString()).toBe('@keyframes ani');
    });
    it('support percentage,from,to',function(){
      src='@keyframes ani{ 10%{} }';
      firstKeyFramesIdToBe('10%');
      src='@keyframes ani{ from{} }';
      firstKeyFramesIdToBe('from');
      src='@keyframes ani{ to{} }';
      firstKeyFramesIdToBe('to');
    });
    it('support browser vendor prefix',function(){
      src='@-webkit-keyframes ani{}';
      getFirstMedia(src);
      expect(media.toString()).toBe(src.replace('{}',''));
      src='@-o-keyframes ani{}';
      getFirstMedia(src);
      expect(media.toString()).toBe(src.replace('{}',''));
      src='@-moz-keyframes ani{}';
      getFirstMedia(src);
      expect(media.toString()).toBe(src.replace('{}',''));
      src='@-ms-keyframes ani{}';
      getFirstMedia(src);
      expect(media.toString()).toBe(src.replace('{}',''));
    })
  });
  describe('b.resolve with sheet:',function(){
    var vendorPrefixes=['o','moz','ms','webkit',''].map(function(pre){
      if(pre)pre='-'+pre+'-';
      return '@'+pre+'keyframes {*}';
    });
    it('can add vendor prefix',function(){
       ChangeSS.opt.addKeyFramesVendorPrefix=true;
       src='@keyframes ani{from{width:0} to{width:200px}}';
       getFirstSheet(src);
       var r=sheet.resolve(),keys=Object.getOwnPropertyNames(r);
       expect(keys.length).toBe(5);
       keys.forEach(function(key){expect(vendorPrefixes).toContain(key.replace('ani',''));});
     });
    it('do not add other vendor prefixes  if it has',function(){
      ChangeSS.opt.addKeyFramesVendorPrefix=true;
      src='@-webkit-keyframes ani{from{width:0} to{width:200px}}';
      getFirstSheet(src);
      var r=sheet.resolve(),keys=Object.getOwnPropertyNames(r);
      expect(keys.length).toBe(1);
    });
    it('if prefer,detect vendor prefix and change @keyframes',function(){
      src='@keyframes ani{from{width:0} to{width:200px}}';
      ChangeSS.opt.preferKeyFramesVendorPrefix=true;
      ChangeSS.opt.addKeyFramesVendorPrefix=false;
      getFirstSheet(src);
      var r=sheet.resolve(),keys=Object.getOwnPropertyNames(r);
      expect(keys.length).toBe(1);
      expect(keys[0].replace(' ani{*}','')).toBe('@-'+ChangeSS.opt.vendorPrefix+'-keyframes');
      ChangeSS.opt.preferKeyFramesVendorPrefix=false;
      getFirstSheet(src);
      r=sheet.resolve();
      keys=Object.getOwnPropertyNames(r);
      expect(keys.length).toBe(1);
      expect(keys[0].replace(' ani{*}','')).toBe('@keyframes');
    });
    it('ignore invalid rules',function(){
      ChangeSS.opt.addKeyFramesVendorPrefix=ChangeSS.opt.preferKeyFramesVendorPrefix=false;
      src='@keyframes move{' +
        'color:red;' +
        'invalid{left:20px}' +
        ' to{left:100px;}}';
      getFirstSheet(src);
      stringEqual(sheet.toString(),'@keyframes move{to { left:100px; }}');
    })
  });
  describe('c.var can be used in @keframes:',function(){
    beforeEach(function(){
      ChangeSS.opt.addKeyFramesVendorPrefix=false;
      ChangeSS.opt.preferKeyFramesVendorPrefix=false;
    });
    afterEach(function(){
      ChangeSS.opt.addKeyFramesVendorPrefix=ChangeSS.opt.preferKeyFramesVendorPrefix=true;
    });
    it('like style holds defValues',function(){
      src='@keyframes move($desWidth:100px){' +
        ' to{left:$desWidth;}}';
      stringEqual(getFirstSheet(src).toString(),'@keyframes move{to { left:100px; }}');
      src+='$desWidth:200px';
      stringEqual(getFirstSheet(src).toString(),'@keyframes move{to { left:200px; }}');
    });
  });

});