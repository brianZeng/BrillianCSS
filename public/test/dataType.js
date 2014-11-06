/**
 * Created by 柏然 on 2014/11/4.
 */
describe("Basic Type Behaviors", function () {
  var source = '$len:20px;' +
    '$list:20px solid red;' +
    '$fun:rgb(20,120,20);';
  var sheet = ChangeSS(source)[0], vars = sheet.vars, len, Fun = ChangeSS.InlineFunc, Var = ChangeSS.Var,
    getType = function (o) {
      return ChangeSS.getType(o);
    }, Length = ChangeSS.Length, Exp = ChangeSS.Exp,
    TYPE = ChangeSS.TYPE, List = ChangeSS.List;
  describe('Length behaviors', function () {
    len = sheet.vars['$len'];
    var lenReduced = len.reduce(), lenResolved = len.resolve();
    it('Length resolves(reduces) to an instance of Length', function () {
      expect(lenReduced).toEqual(jasmine.any(ChangeSS.Length));
      expect(lenResolved).toEqual(jasmine.any(ChangeSS.Length));
    });
    it("Length reduces to itself,and resolves to another Length,they are not the same", function () {
      expect(lenReduced).toBe(len);
      expect(lenResolved).not.toBe(len);
      expect(lenReduced).not.toBe(lenResolved);
      expect(lenReduced).toEqual(lenResolved);
    });
    it('Length.toString() is TYPE.KEYWORD, and it can be parsed to another equal Length', function () {
      expect(getType(len + '')).toBe(TYPE.KEYWORD);
      expect(getType(len)).toBe(TYPE.LENGTH);
      expect(ChangeSS.Length.parse(len + '')).toEqual(len);
    });
    it('fractionalDigitals number of Length.toString() is no more than Length.fractionalDigitals(default is 4 deigitals)', function () {
      var Len = function (num) {
        return ChangeSS.Length(num) + ''
      };
      expect(Len('12.003')).toBe('12.003');
      expect(Len('12.0030')).toBe('12.003');
      expect(Len('12.0030')).not.toBe('12.0030');
      expect(Len('.303453')).not.toBe('0.303453');
      expect(Len('.303453')).not.toBe('0.3034');
      expect(Len('.303453')).toBe('0.3035');
      ChangeSS.Length.fractionalDigitals = 3;
      expect(Len('.303453')).not.toBe('0.3035');
      expect(Len('.303453')).toBe('0.303');
      ChangeSS.Length.fractionalDigitals = 4;
    })
  });
  describe('Var behaviors', function () {
    it('Var resolves to another Var without param', function () {
      expect(Var('$a').resolve()).toEqual(Var('$a').clone());
    });
    it('Var resolves to any type given the param which has the same name property of vars symbol', function () {
      var $param = {
        '$len': Length('3pi'),
        '$key': 'absolute',
        '$list': List('12px bold Arial'),
        '$func': Fun('rotate', List('45deg')),
        '$var': Var('$unknown')
      };
      Object.getOwnPropertyNames($param).forEach(function (name) {
        expect(Var(name).resolve($param)).toBe($param[name]);
      });
    })
  });
  describe('List behaviors', function () {
    it('a list reduces its elements, return itself and keeps its length', function () {
      expect(new ChangeSS.List(1, new ChangeSS.Length(20), 0.33).reduce().length).toEqual(3);
    });
    it('if a list only has 1 element,it resolves to what the element resolves', function () {
      expect(new ChangeSS.List(len).resolve()).toEqual(len.resolve());
      expect(List(Var('$l')).resolve()).toEqual(Var('$l'));
    });
    it('-otherwise it gets a new list of what its elements resolves', function () {
      var l = new ChangeSS.List(len, 'solid');
      expect(l.resolve().length).toBe(2);
      expect(l.resolve()).not.toBe(l);
    });
    it('when resolve 2 nearby strings, they will be connected to 1 string', function () {
      var l = new ChangeSS.List(len, 'solid', 'red');
      expect(vars['$list'].length).toBe(2);
      expect(l.resolve().length).toBe(2);
      expect(l.resolve()).toEqual(new ChangeSS.List(len.resolve(), 'solid red'));
      expect(new ChangeSS.List('a', 'b c').resolve()).toBe('a b c');
      l.unshift('a', 'b c');
      expect(l.resolve()).toEqual(new ChangeSS.List('a b c', len.resolve(), 'solid red'));
    });
  });
  describe('InlineFunc behaviors', function () {
    var paramList = new List('220', '12', '23'), func = new Fun('rgb', paramList), varFunc = new Fun('abs', new List(new Var('$unknown')));
    it('InlineFunc reduces to itself with paramList resolved', function () {
      expect(typeof vars['$fun']).toBe("string");
      expect(func.reduce().param.length).toBe(1);
    });
    it('InlineFunc can resolve to Length,KEYWORD  Or another InlineFunc', function () {
      expect(new Fun('sin', new Length('45deg')).resolve()).toEqual(Length(Math.sin(45 / 180 * Math.PI)));
      expect(func.resolve()).not.toEqual(func);
      expect(func.resolve()).toBe(func.toString());
      expect(getType(varFunc.resolve())).toBe(TYPE.FUNC);
      expect(new Fun('pow', new List(new Length('3px'), new Length(2))).resolve()).toEqual(Length('9px'));
    });
    it('InlineFunc.toString() can be type of TYPE.KEYWORD or TYPE.FUNC', function () {
      expect(new Fun('pow', new List(new Length('3px'), new Length(2))).resolve().toString()).toBe('9px');
      expect(func.resolve().toString()).toEqual('rgb(220,12,23)');
      expect(varFunc.toString()).toBe('abs($unknown)');
    });
  });
  describe('Exp behaviors', function () {
    function expThen(left, optor, right) {
      return Exp(left, optor, right);
    }

    function nestExp(exp, deep) {
      deep = deep || 0;
      for (var i = 0; i < deep; i++)
        exp = Exp(exp);
      return exp;
    }

    it('Exp resolves to Length,Var,InlineFunc,KEYWODR or another Exp', function () {
      var deepExp = nestExp(Length(12), 5);
      //to Length
      expect(deepExp.resolve()).toEqual(Length(12));
      expect(nestExp(Exp(Length(10), '-', Length(5)), 10).resolve()).toEqual(Length(5));
      expect(Exp(Length('2px'), '/', Var('$b')).resolve().clearVarNames()).toEqual(Exp(Length('2px'), '/', Var('$b')));
      deepExp = nestExp(Length('2px'), 3);
      expect(expThen(deepExp, '+', Length(2)).resolve()).toEqual(Length('4px'));
      var paramList = new List('220', '12', '23'), func = new Fun('rgb', paramList);
      //to FUNC
      expect(nestExp(Exp(func), 5).resolve()).toEqual(func.resolve());
      expect(getType(Exp(func).resolve())).toEqual(TYPE.KEYWORD);
      paramList[2] = Var('$g');
      expect(getType(Exp(func).resolve())).toEqual(TYPE.FUNC);
      //to VAR
      expect(nestExp(Var('$a'), 4).resolve()).toEqual(Var('$a'));
      expect(nestExp(Var('$b'), 4).resolve()).toEqual(Var('$b').reduce());
    });
    it('Exp.reduce() trim the expression tree and combine constant values', function () {
      //12px * 4 + 15px= 63px;
      var exp0 = Exp(Length('12px'), '*', Length('4px')), exp = Exp(exp0, '+', Exp(Length('15px')));
      expect(exp.reduce()).toEqual(Exp(Length((12 * 4 + 15) + 'px')));
      expect(expThen(exp0, '+', Length(15)).reduce()).toEqual(exp.reduce());
      expect(Exp(Exp(exp0)).reduce()).toEqual(exp0.clone().reduce());
      expect(expThen(exp, '+', Var('$a')).reduce()).toEqual(expThen(Length('63px'), '+', Var('$a')));
    });
  });
});