/**
 * Created by 柏然 on 2014/11/1.
 */
function Sheet(name) {
  this.name = name || ChangeSS.defaultSheetName;
  this.scopes = [];
  this.mixins = {};
  this.vars = {};
}

Sheet.prototype = (function (proto) {
  proto.add = function (sheetPart) {
    var type = sheetPart.type, Var;
    if (type == 'var') {
      Var = sheetPart.name;
      if (!Var.sheetName || Var.sheetName == this.name) {
        this.vars[Var.symbol] = sheetPart.value;
        Var.sheetName = '';
      }
      else ChangeSS.add(Var);
    }
    else if (type == 'style') {
      this.scopes.push(sheetPart.value);
    }
    else if (type == 'mix') {
      var mixObj;
      Var = sheetPart.name;
      mixObj = Var.sheetName ? ChangeSS.get(Var.sheetName).mixins : this.mixins;
      mixObj[sheetPart.value.symbol = Var.symbol] = sheetPart.value;
    }
    else throw 'unknown type';
    return this;
  };
  proto.resolve = function ($vars) {
    var $param = ChangeSS.assign(mix(this.vars, $vars)), sheet = this;
    return this.scopes.reduce(function (r, scope) {
      r.push.apply(r, scope.resolve($param, sheet));
      return r;
    }, []);
  };
  proto.merge = function (sheet) {
    this.vars = mix(this.vars, sheet.vars);
    this.scopes = this.scopes.concat(sheet.scopes.map(function (s) {
      return s.clone();
    }));
    this.mixins = mix(this.mixins, sheet.mixins);
    return this;
  };
  proto.validate = function () {
    this.scopes.forEach(function (scope) {
      scope.validateSelector();
    });
    return this;
  };

  return proto;
})({});