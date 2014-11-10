/**
 * Created by 柏然 on 2014/11/1.
 */
function Exp(left, optor, right) {
  if (!(this instanceof Exp))return new Exp(left, optor, right);
  this.left = left;
  if (right)this.right = right;
  if (optor) this.optor = optor;
}
Exp.prototype = (function () {
  var TYPE = ChangeSS.TYPE;
  return {
    _type: TYPE.EXP,
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
    get value() {
      if (this.hasVars) return undefined;
      switch (this.type) {
        case TYPE.KEYWORD:
        case TYPE.LENGTH:
          return this.left;
        case TYPE.FUNC:
        case TYPE.LIST:
          return this.left.value;
        default:
          return this.left.opt(this.optor, this.right);
      }
    },
    reduce: function () {
      var left = this.left.resolve(), right = this.right ? this.right.resolve() : undefined, rtype = ChangeSS.getType(right), ltype = ChangeSS.getType(left);
      if (rtype == TYPE.NONE) {
        if (ltype == TYPE.EXP) {
          this.left = left.left;
          this.right = left.right;
          this.optor = left.optor;
        }
        else {
          this.left = left;
          delete this.optor;
          delete this.right;
        }
      }
      else if (ltype == TYPE.LENGTH && rtype == ltype) {
        this.left = left.opt(this.optor, right);
        delete this.optor;
        delete this.right;
      }
      else {
        this.left = left;
        this.right = right;
      }
      return this.clearVarNames();
    },
    canResolve: function ($vars) {
      return this.getVarNames().every(function (v) {
        return v.canResolve($vars);
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
    resolve: (function () {
      var TYPE = ChangeSS.TYPE, getType = ChangeSS.getType;

      function resolveSide(side, $param, exp) {
        switch (getType(side)) {
          case TYPE.VAR:
          case TYPE.FUNC:
          case TYPE.EXP:
          case TYPE.LIST:
            exp.clearVarNames();
            return side.resolve($param);
          case TYPE.KEYWORD:
          case TYPE.LENGTH:
            return side;
          case TYPE.NONE:
            return undefined;
        }
      }

      function clone(obj) {
        return obj.clone ? obj.clone() : obj;
      }

      return function ($resolved) {
        var left = resolveSide(this.left, $resolved, this), right = resolveSide(this.right, $resolved, this), ltype = getType(left), rtype = getType(right), ret;
        this.clearVarNames();
        if (rtype == TYPE.NONE)
          return clone(left);
        switch (ltype) {
          case TYPE.VAR:
          case TYPE.FUNC:
          case TYPE.EXP:
          case TYPE.LIST:
            return new Exp(clone(left), this.optor, clone(right));
        }
        switch (rtype) {
          case TYPE.VAR:
          case TYPE.FUNC:
          case TYPE.EXP:
          case TYPE.LIST:
            return new Exp(clone(left), this.optor, clone(right));
          case TYPE.LENGTH:
            if (ltype == TYPE.LENGTH) return clone(left).opt(this.optor, clone(right));
        }
        Error('invalid Exp:left->' + ltype + ';right->' + rtype);
      }

    })(),
    getVarNames: function (array) {
      var vars;
      if (!(vars = this.variables)) {
        var left = this.left, right = this.right;
        vars = this.variables = [];
        if (left instanceof Var) List.arrayAdd(vars, left);
        else if (left.getVarNames) left.getVarNames(vars);
        if (right)
          if (right instanceof Var)List.arrayAdd(vars, right);
          else if (right.getVarNames) right.getVarNames(vars);
      }
      array = array || [];
      vars.forEach(function (symbol) {
        List.arrayAdd(array, symbol)
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
})();
ChangeSS.Exp = Exp;