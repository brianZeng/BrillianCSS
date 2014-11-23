/**
 * Created by 柏然 on 2014/11/1.
 */
function Var(symbol, sheetName) {
  if (!(this instanceof Var))return new Var(symbol, sheetName);
  this.symbol = symbol.trim();
  this.sheetName = sheetName || '';
}
Var.prototype = (function (TYPE) {
  var VAR = TYPE.VAR, getType = ChangeSS.getType, LEN = TYPE.LENGTH, KEYWORD = TYPE.KEYWORD;

  function isVar(obj) {
    return getType(obj, true) === VAR;
  }
  Var.isVar = isVar;
  return{
    _type: ChangeSS.TYPE.VAR,
    toString: function () {
      var sheetName = this.sheetName;
      return sheetName ? this.symbol + '->' + sheetName : this.symbol;
    },
    get hasVars() {
      return true;
    },
    clone: function () {
      return new Var(this.symbol, this.sheetName);
    },
    reduce: function () {
      return this;
    },
    findRef: function () {
      var value = this, cycle = new Graph();
      while (isVar(value) && value.sheetName) {
        if (cycle.hasVertex(value))
          ChangeSS.error.cyclicInherit(cycle.vertexes.map(function (v) {
            return '[' + v + ']->'
          }), cycle);
        cycle.addVertex(value);
        value = ChangeSS.get(value.toString(), 'var');
      }
      return value;
    },
    resolve: function ($vars) {
      var value, real = this.findRef();
      if (isVar(real) || real == undefined) {
        if ($vars)value = $vars[this.symbol];
      }
      else value = real;
      if (isVar(value))
        if (isVar(real = value.findRef()))return this.clone();
        else value = real;
      return value || this.clone();
    },
    getVar: function (array) {
      array = array || [];
      List.arrayAdd(array, this.symbol);
      return array;
    },
    canResolve: function ($param) {
      var t = getType(this.resolve($param));
      return t == LEN || t == KEYWORD;
    }
  }
})(ChangeSS.TYPE);

ChangeSS.Var = Var;