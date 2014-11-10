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
    var type = sheetPart.type, $key;
    if (type == 'var') {
      var ref = sheetPart.value;
      $key = sheetPart.name;
      if ($key.sheetName == this.name)$key.sheetName = '';
      if (Var.isVar(ref) && !ref.sheetName)ref.sheetName = this.name;
      this.vars[$key.toString()] = sheetPart.value;
    }
    else if (type == 'style') {
      this.scopes.push(sheetPart.value);
      sheetPart.value.sheetName = this.name;
    }
    else if (type == 'mix') {
      var mixObj = sheetPart.value;
      $key = sheetPart.name;
      if ($key.sheetName == this.name) $key.sheetName = '';
      mixObj.symbol = $key.symbol;
      this.mixins[$key.toString()] = mixObj;
    }
    else throw 'unknown type';
    return this;
  };
  proto.resolve = function ($vars) {
    var $assign = ChangeSS.assign(mix(this.vars, $vars)), $param = mix($assign.$unresolved, $assign.$resolved);
    return this.scopes.reduce(function (r, scope) {
      r.push.apply(r, scope.resolve($param));
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
  proto.get = function (id, type) {
    if (type == 'scope' || id[0] != '$') {
      for (var i = 0, scopes = this.scopes, scope = scopes[0]; scope; scope = scopes[++i])
        if (scope.selector == id) return scope;
    } else if (type == 'mixin')
      return this.mixins[id];
    else if (type == 'var')return this.vars[id];
    else return this.mixins[id] || this.vars[id];
  };
  return proto;
})({});