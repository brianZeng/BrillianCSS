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
    var type = sheetPart.type;
    if (type == 'var') {
      var Var = sheetPart.name;
      if (!Var.sheetName || Var.sheetName == this.name) {
        this.vars[Var.symbol] = sheetPart.value;
        Var.sheetName = '';
      }
      else ChangeSS.add(Var);
    }
    else if (type == 'style')
      this.scopes.push(sheetPart.value);
    else if (type == 'mix')
      this.mixins[sheetPart.value.name] = sheetPart.value;
    else throw 'unknown type';
    return this;
  };
  proto.resolve = function ($vars) {
    var $param = ChangeSS.assign(mix(this.vars, $vars));
    return this.scopes.reduce(function (r, scope) {
      r.push.apply(r, scope.resolve($param));
      return r;
    }, []);
  };
  proto.merge = function (sheet) {
    var name = this.name;
    objForEach(sheet.vars, function (key, value) {
      this[key] = value;
    }, this.vars);
    console.warn('no mixin');
    this.scopes = this.scopes.concat(sheet.scopes.map(function (s) {
      return s.clone();
    }));
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