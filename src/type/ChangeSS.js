/**
 * Created by 柏然 on 2014/11/1.
 */
ChangeSS = (function (parser) {
  var sheetMap = {}, getter, setter;

  function main(input) {
    var results = input.split(/\={4,}/g).map(function (src) {
      var sheet = parser.parse(src);
      return getter.sheet(sheet.name).merge(sheet);
    });
    return results;
  }

  main.get = function (name) {
    name = name || main.defaultSheetName;
    if (name) {
      if (name[0] == '$') {

      }
      else return getter.sheet(name);
    }
  };
  getter = {
    sheet: function (name) {
      name = name || main.defaultSheetName;
      var sheet = sheetMap[name];
      return sheet || (sheetMap[name] = new Sheet(name));
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
      return parser.parse(src);
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
ChangeSS.assign = function ($param) {
  var $known = {}, con, typeEnum = Exp.TYPE;
  do {
    con = false;
    objForEach($param, function (key, value) {
      switch (Exp.getType(value)) {
        case typeEnum.KEYWORD:
        case typeEnum.LENGTH:
          $known[key] = value;
          delete $param[key];
          break;
        case typeEnum.NONE:
          throw 'unknown type';
        default :
          if (value.canResolve($known))
            $param[value] = value.resolve($known);
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
  for (var i = 0, o = {}, item = arguments[i]; item; item = arguments[++i])
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