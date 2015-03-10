/**
 * Created by 柏然 on 2014/11/1.
 */
function List() {
  if (!(this instanceof List))return List.fromArray(arguments);
  for (var i = 0, len = arguments.length; i < len; i++)
    this.add(arguments[i]);
}
/*List.addOrMerge = (function () {
  function merge(oriItem, newItem) {
    return newItem;
  }

  function getCompareFunc(keyOrFunc) {
    if (typeof keyOrFunc === 'string')return function (a, b) {
      return a[keyOrFunc] === b[keyOrFunc]
    };
    return keyOrFunc || function (a, b) {
      return a === b;
    }
  }

  return function (arr, obj, keyOrFunc, mergeFunc) {
    if (typeof mergeFunc !== "function")mergeFunc = merge;
    for (var i = 0, len = arr.length, compare = getCompareFunc(keyOrFunc), merged; i < len; i++)
      if (compare(obj, arr[i])) {
        merged = mergeFunc(arr[i], obj);
        if (merged !== undefined)arr[i] = merged;
        return arr;
      }
    arr.push(obj);
    return arr;
  }
})();*/
List.arrayAdd = function arrayAdd(array, item) {
  var r = true;
  if (item instanceof Array)
    for (var i = 0, len = item.length; i < len; i++) r &= arguments.callee(array, item[i]);
  else {
    if (array.indexOf(item) > -1)return false;
    else array.push(item);
  }
  return r;
};
List.uniquePush = function (a) {
  for (var i = 1, change = false, arr = arguments[1], add = List.arrayAdd; arr; arr = arguments[++i])
    for (var j = 0, len = arr.length; j < len; j++)
      if (add(a, arr[j]))change = true;
  return change;
};
List.fromObject = function (combiner, objArray) {
  if (!(objArray instanceof Array)) objArray = [objArray];
  for (var i = 0, list = new List, obj = objArray[0]; obj; obj = objArray[++i])
    Object.getOwnPropertyNames(obj).forEach(function (key) {
      list.push(key + combiner, obj[key]);
    });
  return list;
};
List.fromArray = function (arry) {
  var l = new List();
  Array.prototype.push.apply(l, arry);
  return l;
};
List.mapBy=(function(){
  function equal(a){
    return a;
  }
  return function(nameOrFunc){
    if(typeof nameOrFunc=="string")
      return function(a){return a[nameOrFunc]};
    else if(typeof nameOrFunc=="function")
      return function(a){return nameOrFunc(a);};
    return equal;
  }
})();
List.groupBy=function(arr,mapFuncOrName){
  var ids=[],mapBy=List.mapBy(mapFuncOrName),groups=[],id,item,index;
  for(var i= 0,len=arr.length;i<len;i++){
    index=ids.indexOf(id=mapBy(item=arr[i]));
    if(index==-1) {
      groups.push([item]);
      ids.push(id);
    }
    else groups[index].push(item);
  }
  return groups;
};
List.prototype = (function (proto) {
  proto.add = function (item) {
    if (this.indexOf(item) > -1)return false;
    this.push(item);
    return true;
  };
  proto.remove = function (item) {
    var i = this.indexOf(item);
    if (i > -1) {
      this.splice(i, 1);
      return true;
    }
    return false;
  };
  proto.canResolve = function ($vars) {
    $vars = $vars || {};
    return this.every(function (obj) {
      return (obj.canResolve) ? obj.canResolve($vars) : true;
    });
  };
  proto.clone = function () {
    return arrayReduce(this, function (list, o) {
      list.push(o.clone ? o.clone(true) : o);
      return list;
    }, new List());
  };
  proto.copy = function (array) {
    if (Array.isArray(array)) {
      this.splice(0, this.length);
      Array.prototype.push.apply(this, array);
    }
    else {
      this.splice(0, this.length, array);
    }
    return this;
  };
  proto.resolve = function ($vars) {
    var list = new List(), last;
    this.forEach(function (v) {
      last = list[list.length - 1];
      v = v.resolve ? v.resolve($vars) : v;
      if (typeof v == "string" && typeof last == "string")
        list[list.length - 1] = last + ' ' + v;
      else list.push(v);
    });
    if (list.length == 1)
      return list[0].resolve ? list[0].resolve($vars) : list[0];
    return list;
  };
  proto.getVar = function (array) {
    array = array || [];
    this.forEach(function (o) {
      if (o.hasVars)o.getVar(array)
    });
    return array;
  };
  Object.defineProperty(proto, 'value', {
    get: function () {
      for (var i = 0, r = [], v, item = this[0]; item; item = this[++i]) {
        v = item.resolve ? item.resolve() : item;
        if (v == undefined) return undefined;
        r.push(v);
      }
      return r.length ? r.join(' ').replace(/[\s\r\n\t\f]+/g, ' ').replace(/\,+/g, ',') : '';
    }
  });
  Object.defineProperty(proto, 'resolved', {
    get: function () {
      return this.every(function (v) {
        return v instanceof Length || typeof v == "string";
      })
    }
  });
  Object.defineProperty(proto, 'hasVars', {
    get: function () {
      return this.some(function (o) {
        return o.hasVars
      })
    }});
  proto.toString = function () {
    return this.join(' ').replace(/[\r\n\s\t\f]+/gi, ' ');
  };
  var arrayReduce = function (array, callback, initialValue) {
    return Array.prototype.reduce.apply(array, [callback, initialValue]);
  };
  proto.reduce = function (callback, initialValue) {
    if (arguments.length == 0)
      return this.copy(this.map(function (obj) {
        return obj.reduce ? obj.reduce() : obj
      }));
    else
      return arrayReduce(this, callback, initialValue);
  };
  proto.toParamList = function () {
    return this.copy(this.reduce().filter(function (c) {
      return c != ',';
    }));
  };
  proto._type = ChangeSS.TYPE.LIST;

  return proto;
})(Object.create([]));
ChangeSS.List = List;