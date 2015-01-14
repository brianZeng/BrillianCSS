/**
 * Created by 柏然 on 2014/11/1.
 */
function Sheet(name) {
  this.name = name || ChangeSS.opt.defaultSheetName;
  this.scopes = [];
  this.mixins = {};
  this.vars = {};
}
Sheet.trim=function(sheetName){
  return sheetName? Scope.trimSelector(sheetName).replace(/(\-\>\s*)/,''):'';
};
Sheet.prototype = (function (proto) {
  proto.add = function (sheetPart, type) {
    var $key, ref;
    type = type || sheetPart.type;
    if (sheetPart instanceof Array)
      sheetPart.forEach(function (p) {
        this.add(p, type);
      }, this);
    else if (type == 'var') {
      ref = sheetPart.value;
      $key = sheetPart.name;
      if ($key.sheetName == this.name)$key.sheetName = '';
      if (Var.isVar(ref) && !ref.sheetName)ref.sheetName = this.name;
      this.vars[$key.toString()] = sheetPart.value;
    }
    else if (type == 'style') {
      ref = sheetPart instanceof Style ? sheetPart : sheetPart.value;
      this.scopes.push(ref);
      ref.setSheetName(this.name);
    }
    else if (type == 'mix') {
      var mixObj = sheetPart.value;
      $key = sheetPart.name;
      if ($key.sheetName == this.name) $key.sheetName = '';
      mixObj.symbol = $key.symbol;
      mixObj.isMixin = true;
      mixObj.setSheetName(this.name);
      this.mixins[$key.toString()] = mixObj;
    }
    else if(type=='sheetname')
      this.name=sheetPart.value;
    else throw 'unknown type';
    return this;
  };
  function addResult(container,key,array){
    var r=container[key];
    if(r==undefined)container[key]=array;
    else r.push.apply(r,array);
  }

  /**
   *
   * @param $vars
   * @returns Object<>
   */
  proto.resolve = function ($vars) {
    var $assign = ChangeSS.assign(mix(this.vars, $vars)), $param = mix($assign.$unresolved, $assign.$resolved),r={};
    this.scopes.forEach(function(scope){
      var spec=scope.spec,key,result;
      if(spec===undefined)
        addResult(r,'*',scopeResolveFunc(scope,$param));
      else if(spec instanceof MediaQuery &&typeof (key=spec.resolve($assign.$resolved))=="string")
        addResult(r,key+'{*}',scopeResolveFunc(scope,$param));
      else if(spec instanceof KeyFrame)
      {
        result=scopeResolveFunc(scope,$param);
        spec.getAnimations().forEach(function(key){addResult(r,key+'{*}',result);});
      }
    });
    return r;
  };
  proto.toString =(function(){
    var separator='\n';
    function mapScope(scope){
      var rules = [], brc;
      objForEach(scope.rules, function ( value,key) {rules.push(key + ':' + value + ';');});
      brc=rules.length? '{'+separator+'*'+separator+'}':'{*}';
      return scope.selector+brc.replace('*',rules.join(separator));
    }
    function mapGroup(group){
      return group.map(mapScope).join(separator);
    }
    return function($vars){
      var groups=this.resolve($vars),r=[],keyRep='{'+separator+'*'+separator+'}';
      objForEach(groups,function(group,key){
        key=key.replace('{*}',keyRep);
        r.push(key.replace('*',mapGroup(group)))
      });
      return r.join(separator);
    }
  })();
  proto.merge = function (sheet) {
    this.vars = mix(this.vars, sheet.vars);
    this.scopes = this.scopes.concat(sheet.scopes.map(function (s) {
      var sc = s.clone();
      if (s.sheetName)sc.setSheetName(s.sheetName);
      return sc;
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
  proto.getStyles = function (id) {
    return this.scopes.reduce(function (pre, style) {
      pre.push.apply(pre, style.getStyles(id));
      return pre;
    }, []);
  };
  return proto;
})({});