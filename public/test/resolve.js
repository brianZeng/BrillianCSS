/**
 * Created by 柏然 on 2014/11/9.
 */
describe('scope resolve behaviors', function () {
  function getFirstScope(src) {
    return ChangeSS.compile(src)[0].scopes[0];
  }

  function getFirstSheet(src) {
    return ChangeSS.compile(src)[0];
  }
  function getFirstSheetResolvedObj(source,$vars){
     sheet=ChangeSS.compile(source||src);
    var r=sheet.resolve($vars),keys=Object.getOwnPropertyNames(r);
    return keys.length? r[keys[0]][0]:undefined;
  }
  beforeEach(function(){
    ChangeSS.opt.keepEmptyResult=true;
  });
  afterEach(function(){
    ChangeSS.opt.keepEmptyResult=false;
  });
  var src = 'canvas($height:$width*2;$width:512px){}', scope, sheet;
  describe('a.scope resolves without param use its default var values:', function () {

    it('1.vars are lazy eval.if no var provided,ignore the dynamic rule and log in console   ', function () {
      scope = getFirstScope(src.replace('{}', '{width:$width;height:$height;}'));
      expect(scope.resolve()[0].rules).toEqual({width: ('512px'), height: ('1024px')});
      scope = getFirstScope(src.replace('{}', '{width:$abc}'));
      spyOn(console, 'log');
      expect(scope.resolve()[0].rules).toEqual({});
      if (ChangeSS.traceLog)
        expect(console.log).toHaveBeenCalled();
    });
    it('2.a nested scope can inherit its nearest parent vars', function () {
      src = 'canvas($height:$width*2;$width:512px){}';
      scope = getFirstScope(src.replace('{}', '{ a{width:$width;height:$height;}}'));
      expect(scope.resolve()[1].rules).toEqual({width: ('512px'), height: ('1024px')});
      src = '.parent($height:$width*2;$width:512px;$border:1px solid $borderColor){' +
        '    .child($width:5px;$borderColor:#ff0000){' +
        '      width:$width;' +
        '      height:$height;' +
        '      border:$border;' +
        '}}';
      scope = getFirstScope(src);
      expect(scope.resolve()[1].rules).toEqual({width: ('5px'), height: ('10px'), border: '1px solid #ff0000'});
      src = 'canvas($height:$width*2;$width:512px){}';
      scope = getFirstScope(src.replace('{}', '{ a($height:100px){width:$width;height:$height;}}'));
      expect(scope.resolve()[1].rules).toEqual({width: ('512px'), height: ('100px')});
      scope = getFirstScope(src.replace('{}', '{ a($width:5px){b{width:$width;}}}'));
      expect(scope.resolve()[2].rules).toEqual({width: ('5px')});
      scope = getFirstScope(src.replace('{}', '{ a($width:5px;$height:$width*3){width:$width;height:$height;}}'));
      expect(scope.resolve()[1].rules).toEqual({width: ('5px'), height: ('15px')});
      scope = getFirstScope(src.replace('{}', '{ a($height:$width/2){height:$height;}}'));
      expect(scope.resolve()[1].rules).toEqual({ height: ('256px')});
    });
    it('3.a var can ref to another ref in any sheet', function () {
      src = '$a:$ref;$ref:#ff0000;div{color:$a;}';
      expect(getFirstSheetResolvedObj(src).rules).toEqual({color: '#ff0000'});
    });
    it('4.use nested & scope for hank',function(){
      src='div{color:#ff0000;&{color:rgba(255,0,0,0.8)}}';
      var res=getFirstSheet(src).resolve()['*'],rules=res.map(function(r){return r.rules});
      expect(res.length).toBe(2);
      expect(res.map(function(r){return r.selector})).toEqual(['div','div']);
      expect(rules).toContain({color:'#ff0000'});
      expect(rules).toContain({color:'rgba(255,0,0,0.8)'});
    });
    it('5.mixin nested & scope for hank',function(){
      src='@mixin $double{ color:#ff0000;&{color:rgba(255,0,0,0.8)} } div{@include $double;}';
      var res=getFirstSheet(src).resolve()['*'].filter(function(r){
        return Object.getOwnPropertyNames(r.rules).length>0
      }),rules=res.map(function(r){return r.rules});
      expect(res.length).toBe(2);
      expect(res.map(function(r){return r.selector})).toEqual(['div','div']);
      expect(rules).toContain({color:'#ff0000'});
      expect(rules).toContain({color:'rgba(255,0,0,0.8)'});
    });
  });
  describe('b.scope resolves with param use its default var values:', function () {
    var r;
    it('1.vars belong to a sheet have higher priority over scope vars in this sheet', function () {
      src = 'canvas($height:$width*2;$width:512px){}';
      r=getFirstSheetResolvedObj(src.replace('{}', '{width:$width;height:$height;};$width:21px;'));
      expect(r.rules).toEqual({width: ('21px'), height: ('42px')});
      r=getFirstSheetResolvedObj(src.replace('{}', '{width:$width;height:$height;}$height:21px;'));
      expect(r.rules).toEqual({width: ('512px'), height: ('21px')});
    });
    it('2.if assign values when invoke resolve($assign);$assign has highest priority', function () {
      r=getFirstSheetResolvedObj(src.replace('{}', '{width:$width;height:$height;}$width:21px;'),{$width:Length(101)});
      expect(r.rules).toEqual({width: ('101'), height: ('202')});
    });
  });
  describe('c.include a mixin scope(mixObj)', function () {
    beforeEach(function () {
      src = '@mixin $dashedBorder($border:$borderWidth dashed $borderColor;$background:#ffffff;' +
        '$margin:10px;$borderWidth:1px;$borderColor:#808080){' +
        '    border:$border;' +
        '    background:$background;' +
        '    margin:$margin;' +
        '}';
    });
    it('1.when a scope includes a mixin,the mixin scope does not share the parent scopes', function () {
      var src2 = 'div($margin:20px){' +
        '@include $dashedBorder();' +
        '}';
      expect(getFirstSheetResolvedObj(src+src2)).toEqual({selector: 'div', rules: {border: '1px dashed #808080', background: '#ffffff', margin: '10px'}});
    });
    it('2.when invoked with param,the default param of the mixobj will be shadowed', function () {
      var src2 = 'div($borderColor:#ff0000;$parentMargin:4px){' +
        '@include $dashedBorder(' +
        '$borderColor:$borderColor;' +
        '$borderWidth:2px;$margin:$parentMargin/2);' +
        '}' +
        '@mixin $dashedBorder($border:$borderWidth dashed $borderColor;$background:#ffffff;' +
        '$margin:10px;$borderWidth:1px;$borderColor:#808080){' +
        '    border:$border;' +
        '    background:$background;' +
        '    margin:$margin;' +
        '}';
      var src3='div($borderColor:#ff0000;$margin:4px;$background:#ff0000){' +
        '@include $dashedBorder();}';
      expect(getFirstSheetResolvedObj(src2)).toEqual({selector: 'div',
        rules: {border: '2px dashed #ff0000', background: '#ffffff', margin: '2px'}});
      expect(getFirstSheetResolvedObj(src+src3)).toEqual({selector: 'div',
        rules: {border: '1px dashed #808080', background: '#ffffff', margin: '10px'}});

    });
    it('3.when invoked with a undefined param,the mix obj still use its default param', function () {
      var src2 = 'div($borderColor:#ff0000;$parentMargin:4px){' +
        '@include $dashedBorder($background:$undefined);}';
      expect(getFirstSheetResolvedObj(src+src2).rules).toEqual(jasmine.objectContaining({background: '#ffffff'}));
    });
    it('4.include support extend', function () {
      src = '@mixin $foo{ @extend .bar; } .bar{} div{@include $foo();}';
      expect(getFirstSheetResolvedObj(src).selector).toBe('.bar,div');
    });
    it('5.include support nested', function () {
      src = '@mixin $nest{ &:hover{color:#ff0000;} p{color:#808080;}} div{@include $nest;}';
      sheet = getFirstSheet(src);
      var results=[];
      sheet.resolve()['*'].forEach(function(pair){
        var selector=pair.selector;
        if(results.indexOf(selector)==-1)results.push(selector);
      });
    //  results = sheet.resolve()['*'].reduce(function (r) {return r.selector;});
      expect(results.length).toBe(3);
      expect(results).toContain('div');
      expect(results).toContain('div:hover');
      expect(results).toContain('div p');
    });
  });
});
