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
    else throw 'unknown type';
    return this;
  };
  proto.resolve = function ($vars) {
    var $assign = ChangeSS.assign(mix(this.vars, $vars)), $param = mix($assign.$unresolved, $assign.$resolved),r={},
    reduceFunc= function(scopes){
         return scopes.reduce(function(pre,scope){
           pre.push.apply(pre,scope.resolve($param));
           return pre;
         },[]);
     };
    List.groupBy(this.scopes,'media').forEach(function(group){
      var media=group[0].media,key,gresults=reduceFunc(group);
      if(media===undefined)r["*"]=gresults;
      else if(typeof (key=media.resolve($assign.$resolved))==="string")
        r[key+'{*}']=gresults;
      else if(key instanceof  Array)
        key.forEach(function(k){r[k+'{*}']=gresults.slice()});
    });
   /* return this.scopes.reduce(function (r, scope) {
      r.push.apply(r, scope.resolve($param));
      return r;
    }, []);*/
    return r;
  };
  proto.toString =(function(){
    var separator='\n';
    function mapScope(scope){
      var rules = [], brc;
      objForEach(scope.rules, function (key, value) {rules.push(key + ':' + value + ';');});
      brc=rules.length? '{'+separator+'*'+separator+'}':'{*}';
      return scope.selector+brc.replace('*',rules.join(separator));
    }
    function mapGroup(group){
      return group.map(mapScope).join(separator);
    }
    return function($vars){
      var groups=this.resolve($vars),r=[],keyRep='{'+separator+'*'+separator+'}';
      objForEach(groups,function(key,group){
        key=key.replace('{*}',keyRep);
        r.push(key.replace('*',mapGroup(group)))
      });
      return r.join(separator);
    }
  })();/* function ($vars) {
    return this.resolve($vars).map(function (r) {
      var rules = [], brc;
      objForEach(r.rules, function (key, value) {
        rules.push(key + ':' + value + ';')
      });
      brc = rules.length ? '{\n*\n}' : '{*}';
      return r.selector + brc.replace('*', rules.join('\n'));
    }).join('\n');
  };*/
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