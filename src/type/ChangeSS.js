/**
 * Created by 柏然 on 2014/11/1.
 */
ChangeSS = (function (parser) {
  var sheetMap = {}, getter, setter;
  main.error = {
    notExist: function (name) {
      throw Error('cannot get:' + name);
    }
  };
  function main(input, opt) {
    opt = opt || {keepResults: false};
    return evalInput(input, opt.keepResults).map(function (sheet) {
      return sheet.toString();
    }).join('\n');
  }

  main.eval = evalInput;
  function evalInput(input, keep) {
    if (!keep)clear();
    var results = List();
    main.parse(input).forEach(function (sheet) {
      results.add(merge(sheet));
    });
    ChangeSS.link(results);
    // debugger;
    return results;
  }
  function clear() {
    sheetMap = {};
  }

  function merge(obj) {
    if (obj instanceof Sheet) return getter.sheet(obj.name).merge(obj);
    else throw 'not implement';
  }

  main.merge = merge;

  main.get = function (name, type) {
    name = name || main.defaultSheetName;
    type = (type || '').toLowerCase();
    switch (type) {
      case 'mixin':
      case 'scope':
        return getter.fromFullName(name, type);
      case 'var':
        return getter.variable(name);
      case 'styles':
        return getter.styles(name);
      default :
        return getter.sheet(name);
    }
  };
  main.opt = {
    addKeyFramesVendorPrefix:true,
    preferKeyFramesVendorPrefix:true
  };
  main.opt.vendorPrefix=(function(){
    if(typeof window!=="undefined"&&window.getComputedStyle){
      for(var i= 0,styles=window.getComputedStyle(document.documentElement,''),pre,len=styles.length;i<len;i++){
        if(pre=styles[i].match(/-(moz|webkit|ms|o)-/))break;
      }
      if(pre)return pre[1];
      return styles.OLink? 'o':'';
    }
    return '';
  })();
  getter = {
    sheet: function (name) {
      name = name || main.defaultSheetName;
      var sheet = sheetMap[name];
      return sheet || (sheetMap[name] = new Sheet(name));
    },
    fromFullName: function (name, type) {
      var names = name.split('->'), sheetName = names[1], sheet;
      if (!sheetName)return undefined;
      if (!(sheet = sheetMap[sheetName]))return ChangeSS.error.notExist(name);
      return sheet.get(names[0], type) || ChangeSS.error.notExist(name);
    },
    variable: function (name) {
      var i = name.indexOf('->'), sheetName = name.substr(i + 2), symbol = name.substr(0, i), sheet;
      if (!sheetName || !(sheet = sheetMap[sheetName]) || !symbol)return undefined;
      return sheet.vars[symbol];
    },
    styles: function (globalName) {
      var i = globalName.indexOf('->'), sheet = sheetMap[globalName.substr(i + 2)] || ChangeSS.error.notExist(globalName);
      return sheet.getStyles(globalName.substr(0, i));
    }
  };
  setter = {
    Var: function (Var, value) {
      var sheet = getter.sheet(Var.sheetName);
      sheet.vars[Var.symbol] = value;
      Var.sheetName = '';
    },
    sheet: function (sheet) {
      var name = sheet.name || main.defaultSheetName, os = getter.sheet(name);
      os.merge(sheet);
    }
  };

  main.parse = function (input) {
    return input.split(/\={4,}/g).filter(function (src) {
      return src;
    }).map(function (src) {
      return parser.parse(src).validate();
    });
  };
  main.add = function (something, value) {
    if (something instanceof Sheet) setter.sheet(something);
    else if (something instanceof Var) setter.Var(something, value);
    return this;
  };
  main.getType = function (side, asNone) {
    var type;
    if (!side)return ChangeSS.TYPE.NONE;
    if (typeof side == "string") return ChangeSS.TYPE.KEYWORD;
    else if (type = side._type) return type;
    else if (asNone)return ChangeSS.TYPE.NONE;
    throw  Error('unknown type');
  };
  return main;
})(parser);
ChangeSS.defaultSheetName = 'default';
ChangeSS.assign = function ($param, $known) {
  var con, typeEnum = ChangeSS.TYPE, $unknown = mix($param);
  $known = mix($known);
  do {
    con = false;
    objForEach($unknown, function (key, value) {
      switch (ChangeSS.getType(value)) {
        case typeEnum.KEYWORD:
        case typeEnum.LENGTH:
          $known[key] = value;
          delete $unknown[key];
          break;
        case typeEnum.LIST:
          $unknown[key] = value = value.resolve($known);
          if (!value.hasVars) {
            $known[key] = value.toString();
            delete  $unknown[key];
          } else return;
          break;
        case typeEnum.NONE:
          throw 'unknown type';
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
};
ChangeSS.traceLog = true;
function mix() {
  for (var i = 0, o = {}, item , len = arguments.length; i < len; i++)
    if (item = arguments[i])
    Object.getOwnPropertyNames(item).forEach(function (key) {
      o[key] = item[key];
    });
  return o;
}
function objForEach(obj, callback, thisObj, arg) {
  thisObj = thisObj || obj;
  if (typeof obj == "object" && obj)
    for (var i = 0, keys = Object.getOwnPropertyNames(obj), key = keys[0]; key !== undefined; key = keys[++i])
      callback.apply(thisObj, [key, obj[key], arg]);
  return thisObj;
}
(function (parser) {
  return parser.errorHandler = {
    expect: function (yy, char, ret, error) {
      var lexer = yy.lexer;
      if (lexer.upcomingInput() == char) return ret;
      else if (error)
        Error('expect:' + char + "after" + yy.matched);
      return false;
    }
  }
})(parser);
ChangeSS.TYPE = {
  NONE: 'no',
  EXP: 'exp',
  VAR: 'var',
  LENGTH: 'len',
  FUNC: 'fun',
  KEYWORD: 'keyword',
  LIST: 'list'
};
if(typeof module!=="undefined" && module.exports) module.exports=ChangeSS;