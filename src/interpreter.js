/**
 * Created by 柏然 on 2014/10/21.
 */
function Exp(left, optor, right) {
  if (!(this instanceof Exp))return new Exp(left, right, optor);
  this.left = left;
  if (right)this.right = right;
  if (optor) this.optor = optor;
}
function Length(str) {
  if (!(this instanceof Length)) return new Length(str);
  var m;
  if (!isNaN(str)) {
    this.num = parseFloat(str);
    this.unit = '';
  }
  if (typeof str == "string") {
    m = str.match(/^\-?((\d+(\.\d+)?)|(\.\d+))/);
    if (m) {
      this.num = parseFloat(m[0]);
      this.unit = str.substr(m[0].length);
    }
    else return str;
  }
}
function Scope() {
  this.parent = null;
  this.staticRules = {};
  this.dynamicRules = {};
  this.defValues = {};
  this.includes = {};
  this.nested = [];
  this.exts = [];
}
function List() {
  if (!(this instanceof List))return new List(arguments);
  for (var i = 0, len = arguments.length; i < len; i++)
    this.add(arguments[i]);
}
function InlineFunc(name, paramList) {
  this.name = name;
  this.param = paramList || new List();
}
function Style(selector, scope) {
  Scope.apply(this);
  this.selector = selector;
  this.addScope(scope);
}
function Sheet() {
  this.defValues = {};
  this.styles = new List();
  this.mixins = {};
}
Exp.isVar = function (str) {
  return (typeof  str === "string" && str[0] == '$');
};
Exp.getType = function (side) {
  if (!side)return Exp.TYPE.NONE;
  if (Exp.isVar(side))return Exp.TYPE.VAR;
  else if (side instanceof Length)return Exp.TYPE.LENGTH;
  else if (side instanceof Exp)return Exp.TYPE.EXP;
  else if (side instanceof InlineFunc)return Exp.TYPE.FUNC;
  else if (side instanceof List) return Exp.TYPE.LIST;
  else if (typeof side == "string") return Exp.TYPE.KEYWORD;
  else throw  Error('unknown type');
};
Exp.TYPE = {
  NONE: 'no',
  EXP: 'exp',
  VAR: 'var',
  LENGTH: 'len',
  FUNC: 'fun',
  KEYWORD: 'keyword',
  LIST: 'list'
};
List.arrayAdd = function arrayAdd(array, item) {
  if (item instanceof Array)
    for (var i = 0, len = item.length; i < len; i++) arguments.callee(array, item[i]);
  else {
    if (array.indexOf(item) > -1)return false;
    else array.push(item);
  }
  return true;
};
List.uniquePush = function (a) {
  for (var i = 1, change = false, arr = arguments[1], add = List.arrayAdd; arr; arr = arguments[++i])
    for (var j = 0, len = arr.length; j < len; j++)
      if (add(a, arr[j]))change = true;
  return change;
};
Exp.prototype = {
  opt: function (opt, exp) {
    var left = this.left;
    if (left instanceof Length && exp instanceof Length)
      this.left = left.opt(opt, exp);
    else {
      this.optor = opt;
      this.right = exp;
    }
    return this;
  },
  get isVar() {
    return this.right == undefined && Exp.isVar(this.left);
  },
  get value() {
    if (this.hasVars) return undefined;
    switch (this.type) {
      case Exp.TYPE.KEYWORD:
      case Exp.TYPE.LENGTH:
        return this.left;
      case Exp.TYPE.FUNC:
      case Exp.TYPE.LIST:
        return this.left.value;
      default:
        return this.left.opt(this.optor, this.right);
    }
  },
  reduce: function () {
    var left = this.left, right = this.right;
    if (left instanceof Exp)left = left.reduce();
    if (right instanceof Exp)right = right.reduce();

    if (left.isVar)this.left = left.left;
    else this.left = left;

    if (right)
      if (right instanceof Length && left instanceof Length) {
        this.left = left.opt(this.optor, right);
        delete this.right;
        delete this.optor;
        return this.left;
      }
      else if (right.isVar) this.right = right.left;
      else this.right = right;
    else if (left instanceof Length) return (this.left = left);
    else if (left.isVar)this.left = left.left;
    else this.left = left;

    return this.clearVarNames();
  },
  canResolve: function ($vars) {
    return this.getVarNames().every(function (name) {
      return $vars[name] !== undefined;
    });
  },
  clearVarNames: function () {
    delete this.variables;
    var left = this.left, right = this.right;
    if (left.clearVarNames)left.clearVarNames();
    if (right && right.clearVarNames)right.clearVarNames();
    return this;
  },
  get hasVars() {
    var a = this.getVarNames();
    return a.length > 0;
  },
  get type() {
    if (Exp.getType(this.right) == Exp.TYPE.NONE)
      return Exp.getType(this.left);
    return Exp.TYPE.EXP;
  },
  resolve: (function () {
    function resolveExp(exp, $vars) {
      var left = exp.left, right = exp.right, tem, ltype = Exp.getType(left), rtype = Exp.getType(right), ret = exp, clearVars = true, clearRight;
      switch (ltype) {
        case Exp.TYPE.VAR:
          tem = tem = $vars[left];
          if (tem !== undefined) {
            clearVars = true;
            ltype = Exp.getType(left = exp.left = tem);
          }
          break;
        case Exp.TYPE.LENGTH:
        case Exp.TYPE.KEYWORD:
          ret = left;
          break;
        case Exp.TYPE.EXP:
        case Exp.TYPE.FUNC:
          exp.left = left.resolve($vars);
          return exp.clearVarNames();
        case Exp.TYPE.LIST:
          if (rtype == Exp.TYPE.LIST)
            left.push.apply(left, right);
          else if (rtype !== Exp.TYPE.NONE)
            left.push(right);
          rtype = Exp.TYPE.NONE;
          ret = exp.left = left.resolve($vars);
          break;
        case Exp.TYPE.NONE:
          throw Error('invalid type');
      }
      switch (rtype) {
        case Exp.TYPE.NONE:
          clearRight = true;
          break;
        case Exp.TYPE.LENGTH:
          if (clearRight = (ltype == Exp.TYPE.LENGTH))ret = exp.left = left.opt(exp.optor, right);
          break;
        case Exp.TYPE.KEYWORD:
          throw Error('invalid type');
        case Exp.TYPE.VAR:
          tem = $vars[right];
          if (tem !== undefined)
            clearVars = !!(exp.right = tem);
          break;
        case Exp.TYPE.EXP:
          exp.right = right.resolve($vars);
          return exp.clearVarNames();
      }
      if (clearRight) {
        delete exp.optor;
        delete exp.right;
      }
      if (clearVars)exp.clearVarNames();
      return ret;
    }

    return function ($vars) {
      $vars = $vars || {};
      var v = this.clone();
      while (v.hasVars && v.canResolve($vars))
        resolveExp(v, $vars);
      resolveExp(v, $vars);
      return v.hasVars ? v : v.value;
    }
  })(),
  getVarNames: function (array) {
    var vars;
    if (!(vars = this.variables)) {
      var left = this.left, right = this.right;
      vars = this.variables = [];
      if (Exp.isVar(left)) List.arrayAdd(vars, left);
      else if (left.getVarNames) left.getVarNames(vars);
      if (right)
        if (Exp.isVar(right))List.arrayAdd(vars, right);
        else if (right.getVarNames) right.getVarNames(vars);
    }
    array = array || [];
    vars.forEach(function (key) {
      List.arrayAdd(array, key)
    });
    return array;
  },
  clone: function () {
    var left = this.left, r = new Exp(left.clone ? left.clone(true) : left), right;
    if ((right = this.right) !== undefined) {
      r.right = right.clone ? right.clone(true) : right;
      r.optor = this.optor;
    }
    return r;
  },
  toString: function () {
    var left = this.left, right = this.right;
    if (typeof left !== "string") left = left.toString();
    if (right) {
      if (typeof right !== "string") right = right.toString();
      return left + this.optor + right;
    }
    return left;
  }
};
Length.parse = function (str, unit) {
  if (str instanceof Length) return str.clone();
  var l = new Length(str);
  if (unit !== undefined) l.unit = unit.trim();
  return isNaN(l.num) ? undefined : l;
};
Length.toFixed = function (num, fractionalDititals) {
  var m = Number(num).toFixed(fractionalDititals || Length.fractionalDigitals).match(/^\-?\d+(\.(0*[1-9])+)?/);
  return m ? m[0] : NaN;
};
Length.fractionalDigitals = 4;
Length.convertTable = {
  rad: {
    pi: function (n) {
      return n / Math.PI;
    },
    deg: function (n) {
      return n / Math.PI * 180;
    }
  },
  deg: {
    pi: function (n) {
      return n / 180;
    },
    rad: function (n) {
      return n / 180 * Math.PI;
    }
  },
  pi: {
    rad: function (n) {
      return n * Math.PI;
    },
    deg: function (n) {
      return n * 180;
    }
  }
};
Length.prototype = {
  clone: function () {
    return new Length(this.num + this.unit);
  },
  opt: function (opt, exp) {
    var num, unit = this.unit, otherUnit = exp.unit;
    if (!exp) return this.clone();
    if (otherUnit && unit !== otherUnit)
      num = exp.convert(otherUnit, unit);
    else num = exp.num;
    unit = unit || otherUnit;
    switch (opt) {
      case '+':
        return new Length(this.num + num + unit);
      case '-':
        return new Length(this.num - num + unit);
      case '*':
        return new Length(this.num * num + unit);
      case '/':
        return new Length(this.num / num + unit);
      default :
        throw  'unkonwn optor:' + opt;
    }
  },
  convert: function (otherUnit, thisUnit) {
    var num = this.num, func = Length.convertTable[(thisUnit || this.unit).toLowerCase()];
    if (func && (func = func[otherUnit.toLowerCase()]))return func(num);
    return num;
  },
  toString: function () {
    return isNaN(this.num) ? 'NaN' : (Length.toFixed(this.num) + this.unit);
  },
  reduce: function () {
    return this;
  },
  resolve: function () {
    return this.toString();
  },
  canResolve: function () {
    return true;
  },
  get value() {
    return this.toString();
  }
};
List.fromObject = function (combiner, objArray) {
  if (!(objArray instanceof Array)) objArray = [objArray];
  for (var i = 0, list = new List, obj = objArray[0]; obj; obj = objArray[++i])
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      list.push(key + combiner, obj[key]);
    });
  return list;
};
List.prototype = (function (proto) {
  proto.add = function (item) {
    if (this.indexOf(item) > -1)return false;
    this.push(item);
    return true;
  };
  proto.canResolve = function ($vars) {
    $vars = $vars || {};
    return this.every(function (obj) {
      return (obj.canResolve) ? obj.canResolve($vars) : true;
    });
  };
  proto.clone = function () {
    return arrayReduce(this, function (list, o) {
      list.push(o.clone ? o.clone(true) : o);
      return list;
    }, new List());
  };
  proto.copy = function (array) {
    if (Array.isArray(array)) {
      this.splice(0, this.length);
      Array.prototype.push.apply(this, array);
    }
    else {
      this.splice(0, this.length, array);
    }
    return this;
  };
  proto.resolve = function ($vars) {
    var v = arrayReduce(this, function (list, v) {
      var last = list[list.length - 1];
      v = v.resolve ? v.resolve($vars) : v;
      if (typeof v == "string" && typeof last == "string")
        list[list.length - 1] = last + ' ' + v;
      else list.push(v);
      return list;
    }, new List());
    return v.canResolve($vars) ? v.value : v.length == 1 ? v[0] : v;
  };
  proto.getVarNames = function (array) {
    array = array || [];
    this.forEach(function (o) {
      if (o.hasVars)o.getVarNames(array)
    });
    return array;
  };
  Object.defineProperty(proto, 'value', {
    get: function () {
      for (var i = 0, r = [], v, item = this[0]; item; item = this[++i]) {
        v = item.resolve ? item.resolve() : item;
        if (v == undefined) return undefined;
        r.push(v);
      }
      return r.length ? r.join(' ').replace(/[\s\r\n\t\f]+/g, ' ') : '';
    }
  });
  Object.defineProperty(proto, 'resolved', {
    get: function () {
      return this.every(function (v) {
        return v instanceof Length || typeof v == "string";
      })
    }
  });
  Object.defineProperty(proto, 'hasVars', {
    get: function () {
      return this.some(function (o) {
        return o.hasVars
      })
    }});
  proto.toString = function () {
    return this.join(' ').replace(/[\r\n\s\t\f]+/gi, ' ');
  };
  var arrayReduce = function (array, callback, initialValue) {
    return Array.prototype.reduce.apply(array, [callback, initialValue]);
  };
  proto.reduce = function (callback, initialValue) {
    if (arguments.length == 0)
      return this.copy(this.map(function (obj) {
        return obj.reduce ? obj.reduce() : obj
      }));
    else
      return arrayReduce(this, callback, initialValue);
  };
  return proto;
})(Object.create([]));
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
  getVarNames: function (array) {
    return this.param.getVarNames(array);
  },
  resolve: function ($vars, info) {
    var v = this.param.resolve($vars, info), func, name = this.name, arg;
    func = InlineFunc.Func[name];
    if (func && (arg = this.param).canResolve($vars)) {
      var mathValue = func(arg.map(function (p) {
        return Length.parse(p.resolve ? p.resolve($vars) : p)
      }));
      return mathValue.resolve();
    }
    return typeof v == "string" ? name + '(' + v.replace(/\s+/gi, ',') + ')' : this;
  },
  get value() {
    var v = this.paramValue;
    return v == undefined ? undefined : this.name + v;
  },
  reduce: function () {
    var p = this.param, len;
    if (p.canResolve && p.canResolve())
      if (len = Length.parse(this.resolve()))
        return (this.param = new List(len))[0];
    this.param = p.reduce ? this.param.reduce() : p;
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
    return '(' + v.replace(/\s+/gi, ',') + ')';
  },
  get paramValue() {
    var v = this.param.value;
    return v == undefined ? undefined : '(' + v.replace(/\s+/gi, ',') + ')';
  }
};
Scope.prototype = {
  mixParam: (function () {
    function cloneIfNotHas(a, from) {
      var v;
      if (from)
        Object.getOwnPropertyNames(from).forEach(function (key) {
          if (!a.hasOwnProperty(key)) {
            v = from[key];
            a[key] = v.clone ? v.clone(true) : v;
          }
        });
      return a;
    }
    function inheritDefValues(assign, scope) {
      var o = cloneIfNotHas({}, assign), p = scope;
      while (p) {
        o = cloneIfNotHas(o, p.defValues);
        p = p.parent;
      }
      return o;
    }
    return function (assign, scope) {
      return inheritDefValues(assign, scope || this);
    }
  })(),
  toString: function ($vars) {
    return this.resolve($vars).join('\n');
  },
  get value() {
    var s = this.toString();
    return s.match(/^\{[\s\r\n\t\f;]*\}$/, s) ? undefined : s;
  },
  get paramString() {
    var r = [];
    objForEach(this.defValues, function (key, value) {
      r.push(key + ':' + value)
    });
    return r.length ? '(' + r.join(',') + ')' : '';
  },
  getBodyString: function ($vars, unresolvedInclude, context) {

  },
  getFullString: function ($vars) {
    return this.paramString + this.getBodyString($vars, true);
  },
  add: function (obj) {
    switch (obj.type.toLowerCase()) {
      case 'rule' :
        return this.addRule(obj.name, obj.value);
      case 'def':
        return this.addDefValues(obj.name, obj.value);
      case 'style':
        return this.addStyle(obj.value);
      case 'include':
        return this.addInclude(obj.name, obj.value);
      case 'ext':
        return this.addExt(obj.name);
      case 'mix':
        return this.addMix(obj.value);
    }
    return this;
  },
  addExt: function (selector) {
    List.arrayAdd(this.exts, Style.trimSelector(selector));
    return this;
  },
  addRule: function (key, value) {
    if (typeof value !== "string") this.dynamicRules[key] = value;
    else this.staticRules[key] = value;
    return this;
  },
  addDefValues: function (objOrkey, value) {
    var v;
    if (typeof objOrkey == "string") {
      if (value instanceof List && value.length == 1)value = value[0];
      else if (value.resolve) v = value.resolve();
      this.defValues[objOrkey] = Length.parse(v) || value;
    }
    else objForEach(objOrkey, function (key, v) {
      this.addDefValues(key, v);
    }, this);
    return this;
  },
  addStyle: function (style) {
    var s, ts;
    if (style instanceof Scope) {
      this.nested.push(style);
      style.parent = this;
    }
    return this;
  },
  addInclude: function (varName, rules) {
    this.includes[varName] = rules;
    return this;
  },
  canResolve: function ($vars) {
    $vars = this.mixParam($vars || {});
    return Object.getOwnPropertyNames(this.dynamicRules).every(function (key) {
      return this[key].canResolve($vars);
    }, this.dynamicRules);
  },
  clone: (function () {
    function onPair(key, value) {
      this[key] = value.clone ? value.clone(true) : value;
    }

    return function () {
      var r = new Scope(), parent = this.parent;
      objForEach(this.staticRules, onPair, r.staticRules);
      objForEach(this.dynamicRules, onPair, r.dynamicRules);
      objForEach(this.defValues, onPair, r.defValues);
      objForEach(this.includes, onPair, r.includes);
      if (parent) r.parent = parent;
      r.nested = this.nested.map(function (scope) {
        return scope.clone();
      });
      r.exts = this.exts.slice();
      return r;
    }
  })(),
  resolveSelf: function ($vars, info) {
    var $known = this.assign($vars, info), rules = mix(this.staticRules), knownNames = Object.getOwnPropertyNames($known);
    objForEach(this.dynamicRules, function (key, value) {
      if (value.canResolve($known))
        rules[key] = value.clone().resolve($known);
      else if (info)
        info[key] = this.recordUnresolvedInfo(knownNames, value);
    }, this);
    return rules;
  },
  resolveNested: function ($vars, arg) {
    return this.nested.reduce(function (r, scope) {
      r.push.apply(r, scope.resolve($vars, arg));
      return r;
    }, []);
  },
  recordUnresolvedInfo: function ($known, unresolved) {
    var knownNames = $known instanceof Array ? $known : Object.getOwnPropertyNames($known), r = [];
    unresolved.getVarNames().forEach(function (v) {
      if (knownNames.indexOf(v) == -1) List.arrayAdd(r, v);
    });
    return 'exp:|' + unresolved + '| unable to find var:' + r.join(' ');
  },
  assignDefValues: function ($known) {
    var r = {};
    objForEach(this.defValues, function (key, value) {
      if (value.resolve && value.hasVars && value.canResolve($known))
        r[key] = value.resolve($known);
      else if (typeof value == "string")
        r[key] = value;
    });
    objForEach($known, function (key, value) {
      if (!r.hasOwnProperty(key) && !value.hasVars)
        r[key] = value;
    });
    return r;
  },
  assign: function (assigns, info, unresolved) {
    var result = {}, unres = this.mixParam(assigns), con;
    do {
      con = false;
      objForEach(unres, function (key, value) {
        if (value.canResolve && value.canResolve(result))
          while (value.canResolve)
            value = value.resolve(result);
        if ((value instanceof Length) || (typeof value == "string") || (value instanceof List && value.resolved)) {
          result[key] = Length.parse(value) || value;
          con = true;
          delete unres[key];
        }
      });
      if (!con)
        con = Object.getOwnPropertyNames(unres).some(function (key) {
          return unres[key].canResolve(result);
        });
    } while (con);
    if (info) {
      var known = Object.getOwnPropertyNames(result);
      objForEach(unres, function (key, value) {
        info[key] = this.recordUnresolvedInfo(known, value);
      }, this);
    }
    if (unresolved && typeof unresolved == "object")
      for (var i in unres) unresolved[i] = unres[i];
    return result;
  },
  reduce: function () {
    var staticRules = this.staticRules, v;
    objForEach(this.dynamicRules, function (key, value) {
      v = value.value;
      if (v !== undefined) {
        delete this[key];
        staticRules[key] = v;
      }
    });
    return this;
  },
  remove: function (key) {
    if (Exp.isVar(key)) return delete this.defValues[key];
    if (this.staticRules.hasOwnProperty(key))return delete this.staticRules[key];
    if (this.dynamicRules.hasOwnProperty(key))return delete this.dynamicRules[key];
  },
  resolve: (function () {
    function assignIncludeParam($param, $known) {
      var r = {}, con;
      do {
        con = false;
        objForEach($param, function (key, value) {
          if (typeof value == "string") {
            value = Length.parse(value) || value;
            $known[key] = value;
            r[key] = value;
            delete $param[key];
          }
          else if (value.resolve && value.canResolve($known)) {
            while (value.canResolve) value = value.resolve($known);
            $param[key] = value
          }
          else return;
          con = true;
        });
        if (!con)
          con = Object.getOwnPropertyNames($param).some(function (key) {
            $param[key].canResolve($known)
          });
      } while (con);
      return r;
    }

    function resolveInclude(mixin, $param, selfRules, arg) {
      var $known, selfRule, r = [];
      $known = mixin.assign($param, arg.info);
      selfRule = mixin.resolveSelf($known, arg.info);
      objForEach(selfRule, function (key, value) {
        selfRules[key] = value
      });
      r.push.apply(r, resolveIncludeNested(mixin, $known, arg));
      r.push.apply(r, resolveIncludes(mixin.includes, $known, selfRules, arg));
      return r;
    }

    function resolveIncludeNested(mixin, $param, arg) {
      mixin.selector = arg.selector;
      var r = mixin.resolveNested($param, arg);
      mixin.selector = '';
      return r;
    }

    function resolveIncludes(includesObj, $known, selfResults, arg) {
      var r = [];
      objForEach(includesObj, function (key, paramList) {
        var mixin = arg.getMixScope(key);
        if (mixin)
          r.push.apply(r, resolveInclude(mixin, assignIncludeParam(paramList, $known), selfResults, arg));
      });
      return r;
    }

    function getObjString(obj, separator) {
      for (var r = Object.getOwnPropertyNames(obj), i = 0, key = r[0]; key; key = r[++i])
        r[i] = key + ':' + obj[key] + ';';
      return '{\n' + r.join(separator || '\r\n') + (r.length ? '\n}' : '}');
    }

    return function ($vars, arg) {
      arg = arg || {info: {}};
      var $unkonwn = {}, $known = this.assign($vars, arg.info, $unkonwn), selfResult, results = [];
      selfResult = this.resolveSelf($known, arg.info);
      if (arg.getMixScope) {
        arg.selector = this.selector || '';
        results = resolveIncludes(this.includes, $known, selfResult, arg);
      }
      results.unshift.apply(results, this.resolveNested($vars, arg));
      results.unshift({body: getObjString(selfResult, arg.separator), selector: this.selector});
      if (arg.setExtends)arg.setExtends(this);
      return results;
    }
  })()
};

Style.trimSelector = function (selector) {
  return selector.replace(/[\r\n\t\f\s]+/gi, ' ').trim();
};
Style.prototype = (function (scopeProto) {
  var cloneFunc = scopeProto.clone, proto;
  proto = Object.create(scopeProto);
  proto.getFullString = function ($vars, unresolved) {
    return this.selector + proto.getFullString.apply(this, [$vars, unresolved]);
  };
  proto.toString = function ($vars) {
    return this.selector + this.getBodyString($vars);
  };
  Object.defineProperty(proto, 'selector', {
    get: function () {
      var sec = this._selector, p, ps, r, s;
      if (sec)return this._selector;
      s = this._selectorList;
      if (p = this.parent) {
        ps = p.selector.split(',');
        r = s.reduce(function (array, childSelector) {
          var concat = /^&/.test(childSelector) ? childSelector.substr(1).trim() : (' ' + childSelector);
          array.push.apply(array, ps.map(function (pSelector) {
            return pSelector + concat;
          }));
          return array;
        }, []);
      }
      else r = s;
      return this._selector = r.join(',');
    },
    set: function (list) {
      this._selector = null;
      if (!list) this._selectorList = [];
      else if (typeof  list == "string") list = list.split(',');
      if (list && list.map)this._selectorList = list.map(Style.trimSelector);
    }
  });
  Object.defineProperty(proto, 'value', {
    get: function () {
      var s = this.getBodyString();
      return s == '{}' ? undefined : this.selector + s;
    }
  });
  proto.addScope = function (scope) {
    if (scope instanceof Scope) {
      this.defValues = mix(this.defValues, scope.defValues);
      this.staticRules = mix(this.staticRules, scope.staticRules);
      this.dynamicRules = mix(this.dynamicRules, scope.dynamicRules);
      this.includes = mix(this.includes, scope.includes);
      this.exts.push.apply(this.exts, scope.exts);
      for (var i = 0, ns = scope.nested, children = this.nested, child = ns[0]; child; child = ns[++i]) {
        children.push(child);
        child.parent = this;
      }
    }
    return this;
  };
  proto.clone = function () {
    return new Style(this._selectorList, cloneFunc.apply(this));
  };
  return proto;
})(Scope.prototype);
Sheet.prototype = (function (proto) {
  var sheetProto = {};
  ['getFullString', 'assign', 'mixParam', 'addDefValues', 'recordUnresolvedInfo', 'add'].forEach(function (key) {
    sheetProto[key] = proto[key];
  });
  sheetProto.addStyle = function (style) {
    if (style instanceof Style)
      this.styles.push(style);
    return this;
  };
  Object.defineProperty(sheetProto, 'paramString', Object.getOwnPropertyDescriptor(proto, 'paramString'));
  function getExts(map, array, baseSelector) {
    if (array.indexOf(baseSelector) > -1) Error('cannot extends self:' + baseSelector);
    var r = array.slice();
    array.forEach(function (inherited) {
      var inheritedArray = map[inherited];
      if (inheritedArray instanceof Array) List.uniquePush(r, getExts(map, inheritedArray, baseSelector));
      else List.arrayAdd(r, inherited);
    });
    return r;
  }

  sheetProto.resolve = function ($vars, info) {
    var $unkonwn = {}, $param = this.assign($vars, info, $unkonwn), ctx = getContext(this, info), expMap = ctx.expMap, styles = this.styles, extArray;
    $param = mix($unkonwn, $param);
    return styles.reduce(function (resultArr, style) {
      List.uniquePush(resultArr, style.clone().resolve($param, ctx));
      return resultArr;
    }, []).map(function (o) {
      if (extArray = expMap[o.selector]) {
        extArray = getExts(expMap, extArray, o.selector);
        if (extArray.length)
          o.selector += ',' + extArray.join(',');
      }
      return o;
    });
  };
  function addExtends(map, baseSlt, extSlt) {
    var arr = map[baseSlt];
    if (!arr)arr = map[baseSlt] = [];
    List.arrayAdd(arr, extSlt);
  }

  function getContext(sheet, info) {
    var expMap = {};
    return {
      getMixScope: function (name) {
        return sheet.mixins[name];
      },
      info: info || {},
      get expMap() {
        return expMap;
      },
      setExtends: function (style) {
        var exts = style.exts, styleSlt = style.selector;
        if (exts)exts.forEach(function (ext) {
          addExtends(expMap, ext, styleSlt);
        });
      }
    };
  }

  sheetProto.toString = function ($vars) {
    var r = this.resolve($vars), add = List.arrayAdd;
    return r.reduce(function (pre, pair) {
      add(pre, pair.selector + pair.body);
      return pre;
    }, []).join('\n');
  };
  sheetProto.getBodyString = function ($vars, unresolvedInclude) {
    var info = {}, arg = this.assign($vars, info, true);
    return this.styles.map(function (style) {
      return style.toString(arg, unresolvedInclude);
    }).join('\n');
  };
  sheetProto.parse = function (string) {
    try {
      return parser.parse(string);
    }
    catch (e) {
      throw e;
    }
    finally {
      parser.lexer.popState();
    }
  };
  sheetProto.addMix = function (scope) {
    this.mixins[scope.name] = scope;
    return this;
  };

  return sheetProto;
})(Scope.prototype);
function mix() {
  for (var i = 0, o = {}, item = arguments[i]; item; item = arguments[++i])
    Object.getOwnPropertyNames(item).forEach(function (key) {
      o[key] = item[key];
    });
  return o;
}
function objForEach(obj, callback, thisObj, arg) {
  thisObj = thisObj || obj;
  if (typeof obj == "object" && obj)
    for (var i = 0, keys = Object.getOwnPropertyNames(obj), key = keys[0]; key !== undefined; key = keys[++i])
      callback.apply(thisObj, [key, obj[key], arg]);
  return obj;
}
(function (parser) {
  return parser.errorHandler = {
    expect: function (yy, char, ret, error) {
      var lexer = yy.lexer;
      if (lexer.upcomingInput() == char) return ret;
      else if (error)
        Error('expect:' + char + "after" + yy.matched);
      return false;
    }
  }
})(parser);
