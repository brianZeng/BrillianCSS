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
  function main(input, keep) {
    if (!keep)clear();
    var results = main.parse(input).map(function (sheet) {
      return merge(sheet);
    });
    ChangeSS.validateMix_Ext(results);
    return results;
  }

  main.validateMix_Ext = function (sheets) {

  };
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
        return getter.fromFullName(name, 'mixins');
      case 'scope':
        return getter.fromFullName(name, 'scopes');
      default :
        return getter.sheet(name);
    }

  };
  getter = {
    sheet: function (name) {
      name = name || main.defaultSheetName;
      var sheet = sheetMap[name];
      return sheet || (sheetMap[name] = new Sheet(name));
    },
    fromFullName: function (name, sheetPro) {
      var names = name.split('->'), sheetName = names[1], sheet;
      if (!sheetName)return undefined;
      if (!(sheet = sheetMap[name]))return ChangeSS.error.notExist(name);
      return sheet[sheetPro][names[0]] || ChangeSS.error.notExist(name);
    }
  };
  setter = {
    Var: function (Var) {
      var sheet = getter.sheet(Var.sheetName);
      sheet.vars[Var.symbol] = Var;
      Var.sheetName = '';
    },
    sheet: function (sheet) {
      var name = sheet.name || main.defaultSheetName, os = getter.sheet(name);
      os.merge(sheet);
    }
  };

  main.parse = function (input) {
    return input.split(/\={4,}/g).map(function (src) {
      return parser.parse(src).validate();
    })
  };
  main.add = function (something) {
    if (something instanceof Sheet) setter.sheet(something);
    else if (something instanceof Var) setter.Var(something);
    return this;
  };
  main.getType = function (side) {
    var type;
    if (!side)return ChangeSS.TYPE.NONE;
    if (typeof side == "string") return ChangeSS.TYPE.KEYWORD;
    else if (type = side._type) return type;
    else throw  Error('unknown type');
  };
  return main;
})(parser);
ChangeSS.defaultSheetName = 'default';
ChangeSS.assign = function ($param, $known) {
  var con, typeEnum = ChangeSS.TYPE;
  $known = $known || {};
  do {
    con = false;
    objForEach($param, function (key, value) {
      switch (ChangeSS.getType(value)) {
        case typeEnum.KEYWORD:
        case typeEnum.LENGTH:
          $known[key] = value;
          delete $param[key];
          break;
        case typeEnum.NONE:
          throw 'unknown type';
        default :
          if (value.canResolve($known))
            $param[key] = value.resolve($known);
          else return;
      }
      con = true;
    });
    if (!con)
      con = Object.getOwnPropertyNames($param).some(function (key) {
        $param[key].canResolve($known)
      });
  } while (con);
  return $known;
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