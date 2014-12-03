/**
 * Created by 柏然 on 2014/11/1.
 */
function InlineFunc(name, paramList) {
  if (!(this instanceof InlineFunc))return new InlineFunc(name, paramList);
  this.name = name;
  this.param = paramList || new List();
}
objForEach(Math, function (key, fun, def) {
    if (typeof fun == "function") {
      var convertArg = def.arg[key], convertRes = def.res[key];
      this[key] = function (mathArg) {
        var v = Length.parse(fun.apply(Math, mathArg.map(function (len) {
          return convertArg ? convertArg(len) : len.num;
        })), mathArg[0].unit);
        return convertRes ? convertRes(v) : v;
      }
    }
  }, InlineFunc.Func = {},
  (function () {
    var types = [function (len) {
      return len.convert('rad')
    },
      function (len) {
        len.convert(len.unit = 'deg', 'rad');
        return len;
      },
      function (len) {
        len.unit = '';
        return len;
      }];
    return {
      arg: {sin: types[0], cos: types[0], tan: types[0]},
      res: {asin: types[1], acos: types[1], atan: types[1], sin: types[2], cos: types[2], tan: types[2]}
    }
  })());
InlineFunc.prototype = {
  _type: ChangeSS.TYPE.FUNC,
  get hasVars(){
    return this.param.hasVars;
  },
  getVar: function (array) {
    return this.param.getVar(array);
  },
  resolve: function ($vars, info) {
    var v = this.param.resolve($vars, info), func, name = this.name, ret;
    func = InlineFunc.Func[name];
    if (!(v instanceof List))v = new List(v);
    if (func && v.canResolve($vars))
      return func(v.map(function (p) {
        return Length.parse(p.resolve ? p.resolve($vars) : p)
      })).resolve();
    ret = new InlineFunc(this.name, v);
    return v.hasVars ? ret : ret.toString();
  },
  reduce: function () {
    var p = this.param.resolve();
    this.param = p instanceof List ? p : new List(p);
    return this;
  },
  clone: function () {
    var p = this.param;
    return new InlineFunc(this.name, p.clone ? p.clone() : p);
  },
  canResolve: function ($vars) {
    var p = this.param;
    return typeof p == "string" ? true : p.canResolve($vars);
  },
  toString: function () {
    return this.name + this.paramString;
  },
  get paramString() {
    var v = this.param.toString();
    return '(' + v.replace(/\s+\,\s*/g, ',') + ')';
  },
  get paramValue() {
    var v = this.param.value;
    return v == undefined ? undefined : '(' + v.replace(/\s+/gi, ',') + ')';
  }
};
ChangeSS.InlineFunc = InlineFunc;