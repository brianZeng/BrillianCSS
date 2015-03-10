/**
 * Created by 柏子 on 2015/1/14.
 */
var keepEmptyResult = false;
/**
 * @name ChangeSS.opt.keepEmptyResult
 * @type boolean
 */
Object.defineProperty(ChangeSS.opt, 'keepEmptyResult', {
  set: function (v) {
    keepEmptyResult = !!v;
  },
  get: function () {
    return keepEmptyResult
  }});
/**
 * @function
 * @param  {ChangeSS.Scope} scope
 * @param  {Object} $vars
 * @return {Array.<{selector:string,rules:Object,spec:Object}>}
 */
function scopeResolveFunc(scope,$vars) {
  if (!$vars)$vars = {};
  else if ($vars.$resolved)
    $vars = mix($vars.$unresolved, $vars.$resolved);
  return preVisit(scope, $vars);
  function preVisit(scope, $assign) {
    var childScope = 0, results = [], scopeStack = [], paramStack = [];
    do {
      if (childScope = getChild(scope, childScope)) {
        scopeStack.push(scope);
        paramStack.push(assignParam(scope, false, paramStack, $assign));
        scope = childScope;
        childScope = 0;
      }
      else {
        results.unshift.apply(results, resolveScope(scope, paramStack, $assign,scope.spec||getSpec(scopeStack)));
        scope = getChild(scopeStack[scopeStack.length - 1], scope);
        if (!scope) {
          childScope = scope = scopeStack.pop();
          paramStack.pop();
        }
      }
    } while (scope);
    return results;
  }
  function getSpec(stack){
    for(var i= stack.length- 1,spec,scope=stack[i];i>=0;scope=stack[--i])
      if(spec=scope.spec)return spec;
  }
}
function sheetResolveFunc(sheet,$vars){
  var $assign = assign(mix(sheet.vars, $vars)), $param = mix($assign.$unresolved, $assign.$resolved),
    ret={},spec,groupKey,sheetName=sheet.name;
  sheet.scopes.forEach(function(scope){
    scopeResolveFunc(scope,$param).forEach(function(result){
      spec=result.spec;
      groupKey='';
      if(spec===undefined)groupKey='*';
      else if(spec instanceof Var)
        spec=(sheetName==spec.sheetName? sheet:ChangeSS.get(spec.sheetName)).medias[spec.symbol];
      if(spec instanceof MediaQuery&&spec.canResolve($assign.$resolved))
        groupKey=spec.toString($assign.$resolved)+'{*}';
      else if(spec instanceof KeyFrame){
        spec.resolve().forEach(function(key){
          addResult(ret,key+'{*}',result);
        });
      }
      if(groupKey)addResult(ret,groupKey,result);
    });
  });
  return ret;
  function addResult(container,key,result){
    var r=container[key];
    if(r==undefined)container[key]=[result];
    else r.push(result);
  }
}


function log() {
  if (ChangeSS.traceLog)
    console.log.apply(console, arguments);
}
/**
 * @name ChangeSS.assign
 * @param {Object}$param
 * @param {Object}[$known]
 * @returns {{$resolved: Object, $unresolved: Object}}
 */
function assign ($param, $known) {
  var con,$unknown = mix($param),tem;
  $known = mix($known);
  do {
    con = false;
    objForEach($unknown, function (value,key) {
      switch (ChangeSS.getType(value)) {
        case TYPE.KEYWORD:
        case TYPE.LENGTH:
          $known[key] = value;
          delete $unknown[key];
          break;
        case TYPE.LIST:
          $unknown[key] = value = value.resolve($known);
          if (!value.hasVars) {
            $known[key] = value.toString();
            delete  $unknown[key];
          } else return;
          break;
        case TYPE.NONE:
          throw 'unknown type';
       case TYPE.VAR:
          tem=value.resolve($known);
          if(!value.equals(tem))$unknown[key]=tem;
          else return;
          break;
        default :
          if (value.canResolve($known))
            $unknown[key] = value.resolve($known);
          else return;
      }
      con = true;
    });
    if (!con)
      con = Object.getOwnPropertyNames($unknown).some(function (key) {
        $unknown[key].canResolve($known)
      });
  } while (con);
  return {$resolved: $known, $unresolved: $unknown};
}
/**
 *
 * @param scope
 * @param paramStack
 * @param $assign
 * @param group
 * @returns Array.<ChangeSS.scopeResolveResult>
 */
function resolveScope(scope, paramStack, $assign,group) {
  var $vars = assignParam(scope, true, paramStack, $assign), ruleObj = mix(scope.staticRules),
    selector = scope.selectors.join(','), r=[], $resolved = $vars.$resolved;
  if(selector){
    objForEach(scope.includes, function (invokeParam,key) {
      var mixin = ChangeSS.get(key, 'mixin') || ChangeSS.error.notExist(key), $param = {};
      objForEach(ChangeSS.assign(invokeParam, $resolved).$resolved, function (value,key) {
        if (invokeParam[key])$param[key] = value;
      });
      r.push.apply(r,resolveInclude(mixin, $param, selector).filter(function(res){
        return objNotEmpty(res.rules)
      }));
    });
    objForEach(scope.dynamicRules, function ( rule,key) {
      if (!ruleObj.hasOwnProperty(key) && rule.canResolve($resolved))
        ruleObj[key] = rule.resolve($resolved).toString();
      else log('cannot resolve rule ' + key + ':' + rule + ' in:', scope.selector);
    });
    r.push(
      /**
       * @name ChangeSS.scopeResolveResult
       * @type {{rules:Object,selector:String}}
       */
      {rules: ruleObj, selector: selector}
    )
  }
  return r.filter(function (pair) {
    if(group) pair.spec=group;
    return keepEmptyResult || objNotEmpty(pair.rules);
  });
}
function resolveInclude(mixObj, $vars, selector) {
  mixObj.selectors = selector.split(',');
  mixObj.validateSelector();
  var r = mixObj.resolve($vars);
  mixObj.backtraceSelector();
  return r;
}
function getChild(parent, child) {
  if (parent === child || !parent)return 0;
  return parent.nested[parent.nested.indexOf(child) + 1] || 0;
}
function assignParam(scope, resolve, paramStack, $assign) {
  var lastAssign = paramStack[paramStack.length - 1] || {},
    $mix = mix(lastAssign, scope.defValues, $assign);
  return resolve ? ChangeSS.assign($mix) : $mix;
}
function objNotEmpty(obj) {
  return obj && Object.getOwnPropertyNames(obj).length > 0;
}
