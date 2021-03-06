/**
 * Created by 柏然 on 2014/11/1.
 */
/**
 * @namespace ChangeSS.Scope
 * @constructor
 */
function Scope() {
  this.staticRules = {};
  this.dynamicRules = {};
  this.defValues = {};
  this.includes = {};
  this.nested = [];
  this.exts = [];
}
(function (def) {
  function trimSelector(selector) {
    return selector.replace(/[\r\n\t\f\s]+/gi, ' ').trim();
  }

  function splitGlobalName(name) {
    return name.split('->').map(trimSelector);
  }

  def.trimSelector = trimSelector;
  def.splitGlobalName = splitGlobalName;
})(Scope);

Scope.prototype = {
  selectors: [''],
  toString: (function () {
    var separator;
    function rules(ruleObj) {
      return objForEach(ruleObj, function (value,key) {
        this.push(key + ':' + value + ';');
      }, []);
    }
    return function ($vars) {
      separator=ChangeSS.opt.lineSeparator;
      return this.resolve($vars).map(function (r) {
        return r.selector + '{' + separator + rules(r).join(separator) + '}';
      });
    }
  })(),
  get globalName() {
    var sheetName = this.sheetName;
    if (!sheetName)return undefined;
    return (this.symbol || this.selector) + '->' + sheetName;
  },
  setSheetName: function (name) {
    this.sheetName = name;var globalPointer='->'+name;
    objForEach(this.defValues,function(value){
      if(value instanceof Var&&!value.sheetName){
        value.sheetName=name;
      }
    });
    objForEach(this.includes,function(inc){
      objForEach(inc,function(value,key){inc[key.replace(globalPointer,'')]=value;})
    });
    this.nested.forEach(function (s) {
      s.setSheetName(name)
    });
  },
  get paramString() {
    var r = [];
    objForEach(this.defValues, function (value,key) {
      r.push(key + ':' + value);
    });
    return r.length ? '(' + r.join(',') + ')' : '';
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
        return this.addExt(obj.name, obj.sheetName);
      case 'mix':
        return this.addMix(obj.value);
    }
    return this;
  },
  addExt: function (selector, sheetName) {
    var names = selector.split('->').map(Scope.trimSelector);
    selector = names[0];
    sheetName = sheetName || names[1];
    if (sheetName)
      selector += '->' + Sheet.trim(sheetName);
    List.arrayAdd(this.exts, selector);
    return this;
  },
  addRule: function (key, value) {
    if (value.hasVars) this.dynamicRules[key] = value;
    else this.staticRules[key] = value.toString();
    return this;
  },
  addDefValues: function (objOrkey, value) {
    var v,i;
    if (typeof objOrkey == "string") {
      if (value instanceof List && value.length == 1)value = value[0];
      else if (value.resolve) v = value.resolve();
      this.defValues[getVarLocalName(objOrkey)] = Length.parse(v) || value;
    }
    else objForEach(objOrkey, function (v,key) {
      this.addDefValues(key, v);
    }, this);
    return this;
  },
  addStyle: function (style) {
    if (style instanceof Scope) {
      this.nested.push(style);
      if (this.sheetName)style.setSheetName(this.sheetName);
    }
    return this;
  },
  addInclude: function (varName, rules) {
    this.includes[varName] = rules;
    return this;
  },
  asContainer:function(){
    this.selectors=[this.selector=''];
    //TODO:&chidselect
    this.nested.forEach(function(s){
      s.selectors= s.selectors.map(function(slt){return '&'+slt})
    });
    return this;
  },
  asMediaQuery:function(mediaQuery,varLike){
    if(mediaQuery){
      this.spec=mediaQuery;
      if(varLike)mediaQuery.symbol=varLike;
    }
   else if(varLike instanceof Var)
     this.spec=varLike;
    return this.asContainer();
  },
  asKeyFrames:function(prefix,name){
    this.selectors=[this.selector=''];
    this.spec=new KeyFrame(name,prefix);
    this.staticRules=this.dynamicRules=this.includes={};
    return this.asContainer();
  },
  canResolve: function ($vars) {
    $vars = this.mixParam($vars || {});
    return Object.getOwnPropertyNames(this.dynamicRules).every(function (key) {
      return this[key].canResolve($vars);
    }, this.dynamicRules);
  },
  validateSelector: (function () {
    function second() {
      return this.selectors;
    }

    function backtrackSelector() {
      this.selectors=this._parsedSelector;
      this.nested.forEach(function (s) {s.backtraceSelector()});
      this._selector = null;
      this.backtraceSelector = second;
      this.validateSelector = first;
      return this.selectors;
    }
    function replaceSelector(childSlt,parentSlt){
      if(childSlt.indexOf('&')==-1) childSlt=parentSlt+' '+childSlt;
      return childSlt.replace(/\&/g,parentSlt);
    }

    function first(parentSelectors) {
      var r, tss;
      if (parentSelectors) {
        r = [];
        tss =this._parsedSelector= this.selectors;
        parentSelectors.forEach(function (ps) {
          tss.forEach(function (ts) {
            r.push(replaceSelector(ts,ps));
          })
        });
        this.selectors = r;
      }
      else
        r =this._parsedSelector= this.selectors;
      this.nested.forEach(function (scope) {
        scope.validateSelector(r)
      });
      this._selector= null;
      this.validateSelector = second;
      this.backtraceSelector = backtrackSelector;
      return r;
    }
    return first;
  })(),
  backtraceSelector: function () {
    return this.selectors;
  },
  clone: (function () {
    function onPair(value,key) {
      this[key] = value.clone ? value.clone(true) : value;
    }
    return function () {
      var r = new Scope(),self=this;
      if(this._parsedSelector)
        r.validateSelector();
      ['staticRules','dynamicRules','defValues','includes'].forEach(function(key){
        objForEach(self[key],onPair,r[key]);
      });
      r.nested = this.nested.map(function (scope) { return scope.clone(); });
      r.exts = this.exts.slice();
      r.selectors= this.selectors.slice();
      if(this.spec)r.spec=this.spec;
      r._parsedSelector=this._parsedSelector;
      r.setSheetName(this.sheetName);
      return r;
    }
  })(),
  reduce: function () {
    var staticRules = this.staticRules, v;
    objForEach(this.dynamicRules, function (value,key) {
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
  getVar: function (array) {
    array = array || [];
    objForEach(this.dynamicRules, function ( value,key) {
      value.getVar(array);
    });
    return array;
  },
  /**
   * @function
   * @param  $vars {Object}
   * @return {Array<{selector:string,rules:Object}>}
   * TODO:convert <selector,rules,spec>
   */
  resolve:function($vars){
    return scopeResolveFunc(this,$vars);
  }
};
function getVarLocalName(name){
  var i;
  return (i=name.indexOf('->'))==-1? name:name.substring(0,i).trim();
}
ChangeSS.Scope = Scope;
function Style(selectors, scope) {
  Scope.apply(this);
  if(selectors instanceof MediaQuery){
    this.selector='&';
  }
  else
    this.selector= selectors;
  this.addScope(scope || new Scope());
}

Style.prototype = (function (scopeProto) {
  var cloneFunc = scopeProto.clone, proto;
  proto = Object.create(scopeProto);
  Object.defineProperty(proto, 'selector', {
    get: function () {
      return this._selector || (this._selector = this.selectors.join(','));
    },
    set: function (list) {
      if (typeof  list == "string") list = list.split(',');
      if (list) {
        if (list.map)
          this.selectors = list.map(Scope.trimSelector);
        else this.selectors = [Scope.trimSelector(list)];
        this._selector = null;
      }
    }
  });

  proto.addScope = function (scope) {
    if (scope instanceof Scope) {
      var self=this;
      ['staticRules','dynamicRules','defValues','includes'].forEach(function(key){
        self[key]=mix(self[key],scope[key]);
      });
      this.exts.push.apply(this.exts, scope.exts);
      ['validateSelector','backtraceSelector','_parsedSelector'].forEach(function(key){self[key]=scope[key]});
      for (var i = 0, ns = scope.nested, children = this.nested, child = ns[0]; child; child = ns[++i])
        children.push(child);
    }
    return this;
  };
  proto.clone = function () {
    return new Style(this.selectors, cloneFunc.apply(this));
  };
  proto.getStyles = function (id) {
    var s;
    if (id.indexOf(s = this.selector) == 0)
      if (id === s)
        return [this];
      else
        return this.nested.reduce(function (pre, style) {
          pre.push.apply(pre, style.getStyles(id));
          return pre;
        }, []);
    else
      return [];
  };
  return proto;
})(Scope.prototype);