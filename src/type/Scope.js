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
Scope.trimSelector = function (selector) {
  return selector.replace(/[\r\n\t\f\s]+/gi, ' ').trim();
};
Scope.prototype = {
  selectors: [''],
  mixParam: (function () {
    function cloneIfNotHas(a, from) {
      var v;
      if (from)
        Object.getOwnPropertyNames(from).forEach(function (key) {
          if (!a.hasOwnProperty(key)) {
            v = from[key];
            a[key] = v.clone ? v.clone(true) : v;
          }
        });
      return a;
    }

    function inheritDefValues(assign, scope) {
      var o = cloneIfNotHas({}, assign), p = scope;
      while (p) {
        o = cloneIfNotHas(o, p.defValues);
        p = p.parent;
      }
      return o;
    }

    return function (assign, scope) {
      return inheritDefValues(assign, scope || this);
    }
  })(),
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
      r.push(key + ':' + value)
    });
    return r.length ? '(' + r.join(',') + ')' : '';
  },
  getBodyString: function ($vars, unresolvedInclude, context) {

  },
  getFullString: function ($vars) {
    return this.paramString + this.getBodyString($vars, true);
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
        return this.addExt(obj.name);
      case 'mix':
        return this.addMix(obj.value);
    }
    return this;
  },
  addExt: function (selector) {
    List.arrayAdd(this.exts, Style.trimSelector(selector));
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
  clone: (function () {
    function onPair(key, value) {
      this[key] = value.clone ? value.clone(true) : value;
    }

    return function () {
      var r = new Scope(), parent = this.parent;
      objForEach(this.staticRules, onPair, r.staticRules);
      objForEach(this.dynamicRules, onPair, r.dynamicRules);
      objForEach(this.defValues, onPair, r.defValues);
      objForEach(this.includes, onPair, r.includes);
      if (parent) r.parent = parent;
      r.nested = this.nested.map(function (scope) {
        return scope.clone();
      });
      r.exts = this.exts.slice();
      return r;
    }
  })(),
  resolveSelf: function ($vars, info) {
    var $known = this.assign($vars, info), rules = mix(this.staticRules), knownNames = Object.getOwnPropertyNames($known);
    objForEach(this.dynamicRules, function (key, value) {
      if (value.canResolve($known))
        rules[key] = value.clone().resolve($known);
      else if (info)
        info[key] = this.recordUnresolvedInfo(knownNames, value);
    }, this);
    return rules;
  },
  resolveNested: function ($vars, arg) {
    return this.nested.reduce(function (r, scope) {
      r.push.apply(r, scope.resolve($vars, arg));
      return r;
    }, []);
  },
  recordUnresolvedInfo: function ($known, unresolved) {
    var knownNames = $known instanceof Array ? $known : Object.getOwnPropertyNames($known), r = [];
    unresolved.getVarNames().forEach(function (v) {
      if (knownNames.indexOf(v) == -1) List.arrayAdd(r, v);
    });
    return 'exp:|' + unresolved + '| unable to find var:' + r.join(' ');
  },
  assignDefValues: function ($known) {
    var r = {};
    objForEach(this.defValues, function (key, value) {
      if (value.resolve && value.hasVars && value.canResolve($known))
        r[key] = value.resolve($known);
      else if (typeof value == "string")
        r[key] = value;
    });
    objForEach($known, function (key, value) {
      if (!r.hasOwnProperty(key) && !value.hasVars)
        r[key] = value;
    });
    return r;
  },
  assign: function (assigns, info, unresolved) {
    var result = {}, unres = this.mixParam(assigns), con;
    do {
      con = false;
      objForEach(unres, function (key, value) {
        if (value.canResolve && value.canResolve(result))
          while (value.canResolve)
            value = value.resolve(result);
        if ((value instanceof Length) || (typeof value == "string") || (value instanceof List && value.resolved)) {
          result[key] = Length.parse(value) || value;
          con = true;
          delete unres[key];
        }
      });
      if (!con)
        con = Object.getOwnPropertyNames(unres).some(function (key) {
          return unres[key].canResolve(result);
        });
    } while (con);
    if (info) {
      var known = Object.getOwnPropertyNames(result);
      objForEach(unres, function (key, value) {
        info[key] = this.recordUnresolvedInfo(known, value);
      }, this);
    }
    if (unresolved && typeof unresolved == "object")
      for (var i in unres) unresolved[i] = unres[i];
    return result;
  },
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
  resolve: (function () {
    var stack, $param;

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

    function inheritSelectors(ps, cs) {
      var r = [];
      ps.forEach(function (pSelector) {
        cs.forEach(function (cSelector) {
          r.push(cSelector[0] == '&' ? cSelector.replace('&', pSelector) : pSelector + ' ' + cSelector);
        })
      });
      return r.map(Scope.trimSelector);
    }

    function chainSelectors(scope) {
      for (var i = 0, parent = stack[i], r = ['']; parent; parent = stack[++i])
        r = inheritSelectors(r, parent.selectors);
      return inheritSelectors(r, scope.selectors);
    }

    function resolveScope(scope) {
      var $vars = ChangeSS.assign(findVars(scope)), ruleObj = mix(scope.staticRules), r = [];
      objForEach(scope.dynamicRules, function (key, rule) {
        if (rule.canResolve($vars))
          ruleObj[key] = rule.resolve($vars);
        else log('cannot resolve rule:' + rule);
      });
      return {rules: ruleObj, selector: chainSelectors(scope).join(',')};
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
          results.unshift(resolveScope(scope));
          scope = getChild(stack[stack.length - 1], scope);
          if (!scope)childScope = scope = stack.pop();
        }
      } while (scope);
      if (scope)results.push(resolveScope(scope));
      return results;
    }

    return function ($vars) {
      stack = [];
      $param = $vars;
      return preVisit(this);
    }
  })()
};
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
      return this.selectors.join(',')
    },
    set: function (list) {
      if (typeof  list == "string") list = list.split(',');
      if (list)
        if (list.map)
          this.selectors = list.map(Scope.trimSelector);
        else this.selectors = [Scope.trimSelector(list)];
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