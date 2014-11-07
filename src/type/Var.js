/**
 * Created by 柏然 on 2014/11/1.
 */
function Var(symbol, sheetName) {
  if (!(this instanceof Var))return new Var(symbol, sheetName);
  this.symbol = symbol;
  this.sheetName = sheetName || '';
}
Var.prototype = {
  _type: ChangeSS.TYPE.VAR,
  toString: function () {
    var sheetName = this.sheetName;
    return sheetName ? this.symbol + '->' + sheetName : this.symbol;
  },
  get refSymbol() {
    var cur = this, chain = [], sheet, symbol;
    while (cur && (symbol = cur.symbol) && cur.sheetName) {
      if (!List.arrayAdd(chain, cur.sheetName + ':' + cur.symbol)) Error('dependent conflict:' + chain.join('->'));
      if (sheet = ChangeSS.get(cur.sheetName))
        cur = sheet.vars[cur.symbol];
      else return this.symbol;
    }
    return symbol;
  },
  get hasVars() {
    return true;
  },
  clone: function () {
    return new Var(this.symbol, this.sheetName);
  },
  assign: function ($vars) {
    return $vars[this.symbol];
  },
  reduce: function () {
    return this;
  },
  resolve: function ($vars) {
    if (this.sheetName) Error('not implement yet');
    return ($vars ? $vars[this.symbol] : 0) || this.clone();
  },
  getVarNames: function (array) {
    array = array || [];
    List.arrayAdd(array, this.symbol);
    return array;
  },
  canResolve: (function (TYPE) {
    var LEN = TYPE.LENGTH, KEYWORD = TYPE.KEYWORD;
    return function ($param) {
      if (this.sheetName) return false;
      var t = ChangeSS.getType($param[this.symbol]);
      return t == LEN || t == KEYWORD;
    }
  })(ChangeSS.TYPE)
};
ChangeSS.Var = Var;