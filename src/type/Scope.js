/**
 * Created by 柏然 on 2014/11/1.
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
    function mapResult(separator) {
      separator = separator || window ? '\n' : '';
      return function (r) {
        return r.selector + '{' + separator + rules(r).join(separator) + '}';
      }
    }
    function rules(ruleObj) {
      return objForEach(ruleObj, function (value,key) {
        this.push(key + ':' + value + ';');
      }, []);
    }
    return function ($vars, separator) {
      return this.resolve($vars).map(mapResult(separator));
    }
  })(),
  get globalName() {
    var sheetName = this.sheetName;
    if (!sheetName)return undefined;
    return (this.symbol || this.selector) + '->' + sheetName;
  },
  setSheetName: function (name) {
    this.sheetName = name;
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
    var v;
    if (typeof objOrkey == "string") {
      if (value instanceof List && value.length == 1)value = value[0];
      else if (value.resolve) v = value.resolve();
      this.defValues[objOrkey] = Length.parse(v) || value;
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
    var nested=this.nested,def=this.defValues;
    Scope.apply(this);
    nested.forEach(function(s){s.validateSelector()});
    this.nested=nested;
    this.defValues=def;
    return this;
  },
  asMediaQuery:function(mediaQuery){
    this.asContainer().spec=mediaQuery;
    return this;
  },
  asKeyFrames:function(prefix,name){
    this.spec=new KeyFrame(name,prefix);
    this.resolve=keyFrameResolve;
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

    function backtrackSelector(parentSelectors) {
      var r, tss;
      if (parentSelectors) {
        tss = this.selectors;
        r = [];
        parentSelectors.forEach(function (ps) {
          tss.forEach(function (ts) {
            r.push(retraceSelector(ts,ps));
          })
        });
        tss = this.selectors;
        this.selectors = r;
      } else tss = this.selectors;
      this.nested.forEach(function (s) {
        s.backtraceSelector(tss);
      });

      this._selector = null;
      this.backtraceSelector = second;
      this.validateSelector = first;
      return this.selectors;
    }
    function replaceSelector(childSlt,parentSlt){
      if(childSlt[0]!=='&') childSlt=parentSlt+' '+childSlt;
      return childSlt.replace(/\&/g,parentSlt);
    }
    function retraceSelector(childSlt,parentSlt){
      if(childSlt[parentSlt.length]==' ')
        childSlt=childSlt.substring(parentSlt.length+1);
      var rs=childSlt.split(parentSlt),str,ors=[];
      for(var i= 0,len=rs.length;i<len;i++)
        ors.push((str=rs[i])===''?'&':str);
      ors[0].replace(/^&\s+/,'');
      return ors.join('');
    }

    function first(parentSelectors) {
      var r, tss;
      if (parentSelectors) {
        r = [];
        tss = this.selectors;
        parentSelectors.forEach(function (ps) {
          tss.forEach(function (ts) {
            r.push(replaceSelector(ts,ps));
          })
        });
        this.selectors = r;
      }
      else r = this.selectors;
      this.nested.forEach(function (scope) {
        scope.validateSelector(r)
      });
      this._selector = null;
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
      var r = new Scope();
      r.validateSelector();
      objForEach(this.staticRules, onPair, r.staticRules);
      objForEach(this.dynamicRules, onPair, r.dynamicRules);
      objForEach(this.defValues, onPair, r.defValues);
      objForEach(this.includes, onPair, r.includes);
      r.nested = this.nested.map(function (scope) {
        return scope.clone();
      });
      r.exts = this.exts.slice();
      r.selectors = this.selectors.slice();
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
ChangeSS.Scope = Scope;
function Style(selectors, scope) {
  Scope.apply(this);
  if(selectors instanceof MediaQuery){
    this.selector='&';

  }
  else this.selector = selectors;
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
      this.defValues = mix(this.defValues, scope.defValues);
      this.staticRules = mix(this.staticRules, scope.staticRules);
      this.dynamicRules = mix(this.dynamicRules, scope.dynamicRules);
      this.includes = mix(this.includes, scope.includes);
      this.exts.push.apply(this.exts, scope.exts);
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