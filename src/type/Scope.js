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
      separator = separator || window ? '\r\n' : '';
      return function (r) {
        return r.selector + '{' + separator + rules(r).join(separator) + '}';
      }
    }
    function rules(ruleObj) {
      return objForEach(ruleObj, function (key, value) {
        this.push(key + ':' + value + ';');
      }, []);
    }
    return function ($vars, separator) {
      return this.resolve($vars).map(mapResult(separator));
    }
  })(),
  get value() {
    var s = this.toString();
    return s.match(/^\{[\s\r\n\t\f;]*\}$/, s) ? undefined : s;
  },
  get paramString() {
    var r = [];
    objForEach(this.defValues, function (key, value) {
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
    if (sheetName)selector += '->' + sheetName;
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
    else objForEach(objOrkey, function (key, v) {
      this.addDefValues(key, v);
    }, this);
    return this;
  },
  addStyle: function (style) {
    if (style instanceof Scope) {
      this.nested.push(style);
    }
    return this;
  },
  addInclude: function (varName, rules) {
    this.includes[varName] = rules;
    return this;
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
    return function (parentSelectors) {
      var r, tss;
      if (parentSelectors) {
        r = [];
        tss = this.selectors;
        parentSelectors.forEach(function (ps) {
          tss.forEach(function (ts) {
            r.push(ts[0] == '&' ? ts.replace('&', ps) : ps + ' ' + ts);
          })
        });
        this.selectors = r;
      } else r = this.selectors;
      this.nested.forEach(function (scope) {
        scope.validateSelector(r)
      });
      this.validateSelector = second;
      return r;
    }
  })(),
  clone: (function () {
    function onPair(key, value) {
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
    objForEach(this.dynamicRules, function (key, value) {
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
  getVarNames: function (array) {
    array = array || [];
    objForEach(this.dynamicRules, function (key, value) {
      value.getVarNames(array);
    });
    return array;
  },
  getInclude: function (key, parentSheet) {
    return ChangeSS.get(key, 'mixin') || (parentSheet.mixins[key]) || ChangeSS.error.notExist(key);
  },
  resolve: (function () {
    var stack, $param, parentSheet;
    function log() {
      if (ChangeSS.traceLog)
        console.log.apply(console, arguments);
    }
    function findVars(scope) {
      return scope.getVarNames().reduce(function ($vars, varname) {
        if (!$vars[varname])
          for (var s = scope, i = stack.length, value; s; s = stack[--i])
            if (value = s.defValues[varname]) {
              $vars[varname] = value;
              break;
            }
        return $vars;
      }, mix($param));
    }

    function resolveScope(scope) {
      var $vars = ChangeSS.assign(findVars(scope)), ruleObj = mix(scope.staticRules), selector = scope.selector, r;
      objForEach(scope.dynamicRules, function (key, rule) {
        if (!ruleObj.hasOwnProperty(key) && rule.canResolve($vars))
          ruleObj[key] = rule.resolve($vars);
        else log('cannot resolve rule ' + key + ':' + rule + ' in:', scope);
      });
      r = [
        {rules: ruleObj, selector: scope.selectors.join(',')}
      ];
      objForEach(scope.includes, function (key, value) {
        resolveInclude(new Style(selector, scope.getInclude(key, parentSheet)), ChangeSS.assign(value, $vars), r);
      });
      return r;
    }

    function mergeResult(a, b) {
      a.rules = mix(b.rules, a.rules);
      return a;
    }

    function resolveInclude(mixObj, $vars, results) {
      mixObj.validateSelector();
      return mixObj.resolve($vars, parentSheet).forEach(function (resObj) {
        List.addOrMerge(results, resObj, 'selector', mergeResult);
      });
    }
    function getChild(parent, child) {
      if (parent === child || !parent)return 0;
      return parent.nested[parent.nested.indexOf(child) + 1] || 0;
    }
    function preVisit(scope) {
      var childScope = 0, results = [];
      do {
        if (childScope = getChild(scope, childScope)) {
          stack.push(scope);
          scope = childScope;
          childScope = 0;
        }
        else {
          results.unshift.apply(results, resolveScope(scope));
          scope = getChild(stack[stack.length - 1], scope);
          if (!scope)childScope = scope = stack.pop();
        }
      } while (scope);
      return results;
    }

    return function ($vars, sheet) {
      stack = [];
      $param = $vars;
      parentSheet = sheet || ChangeSS.get('');
      return preVisit(this);
    }
  })()
};
ChangeSS.Scope = Scope;
function Style(selectors, scope) {
  Scope.apply(this);
  this.selector = selectors;
  this.addScope(scope);
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
  Object.defineProperty(proto, 'value', {
    get: function () {
      var s = this.getBodyString();
      return s == '{}' ? undefined : this.selector + s;
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
  return proto;
})(Scope.prototype);