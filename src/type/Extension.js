/**
 * Created by 柏然 on 2014/11/6.
 */
function Graph() {
  if (!(this instanceof Graph))return new Graph();
  this.vertexes = this.createList();
  this.adjustList = this.createList();
}
Graph.prototype = {
  createList: function () {
    return new List()
  },
  addVertex: function (data) {
    for (var i = 0, len = arguments.length; i < len; i++)
      if (this.vertexes.add(arguments[i]))
        this.adjustList.push(this.createList());
    return this;
  },
  removeVertex: function (data) {
    var i = this.vertexIndex(data);
    if (i > -1) {
      this.vertexes.splice(i, 1);
      this.adjustList.slice(i, 1);
    }
    return this;
  },
  hasVertex: function (data) {
    return this.vertexes.indexOf(data) > -1;
  },
  isIsolated: function (data) {
    var i = this.vertexIndex(data);
    return i > -1 ? this.adjustList[i].length == 0 : undefined;
  },
  vertexIndex: function (data) {
    return this.vertexes.indexOf(data);
  },
  addEdge: function (from, to) {
    if (from === to) Error('Do not support edge to self:' + from);
    this.addVertex(from, to).adjustList[this.vertexIndex(from)].add(this.vertexIndex(to));
    return this;
  },
  addEdges: function (arr) {
    for (var i = 0, len = arr.length; i < len; i += 2)
      this.addEdge(arr[i], arr[i + 1]);
    return this;
  },
  removeEdge: function (from, to, removeIsolated) {
    var arr = this.adjustList[this.vertexIndex((from))];
    if (arr)return arr.remove(this.vertexIndex(to));
    if (removeIsolated) {
      if (this.isIsolated(from))this.removeVertex(from);
      if (this.isIsolated(to))this.removeVertex(to);
    }
    return this;
  },
  adjustVertexes: function (data) {
    var vs = this.vertexes;
    return this.adjustList[this.vertexes.indexOf(data)].map(function (index) {
      return vs[index]
    });
  },
  mergePaths: (function () {
    function isSubSet(set, superSet) {
      var dis, i, setLen;
      if ((dis = superSet.length - (setLen = set.length)) <= 0)return false;
      for (i = 0; i < setLen; i++)
        if (set[i] !== superSet[dis + i])return false;
      return true;
    }

    return function (paths) {
      var con = 1, len;
      paths.sort(function (a, b) {
        return a.length > b.length
      });
      while (con) {
        con = 0;
        len = paths.length;
        paths = paths.filter(function (p, i) {
          for (i; i < len; i++)
            if (isSubSet(p, paths[i]))
              return !(con = 1);
          return true;
        });
      }
      return paths;
    }
  })(),
  convertPathsData: function (paths) {
    var vs = this.vertexes;
    return paths.map(function (arr) {
      return arr.map(function (i) {
        return vs[i];
      })
    });
  },
  detectCircle: (function () {
    var all = [];

    function deepVisit(preArray, dir, circle) {
      var from = dir.from;
      if (circle)return circle;
      if (preArray.indexOf(from) > -1) {
        preArray.push(from);
        return preArray;
      }
      preArray.push(from);
      for (var i = 0, to = dir.to, len = to.length; i < len && !circle; i++)
        circle = deepVisit(preArray.slice(), all[to[i]]);
      return circle;
    }

    return function (dirs) {
      all = dirs.reduce(function (pre, dir) {
        pre[dir.from] = dir;
        return pre;
      }, []);
      for (var d = 0, dir = dirs[0], circle; dir && !circle; dir = dirs[++d])
        circle = deepVisit([], dir, circle);
      return circle;
    }
  })(),
  getPaths: function (circleCollector) {
    var adsl = this.adjustList, vers = this.vertexes, dirs = vers.map(function (data, i) {
        return {from: i, to: adsl[i].slice()};
      }),
      endPaths = new Array(dirs.length), con = 1, temPaths = new Array(dirs.length), cir;
    for (var i = 0, len = dirs.length; i < len; i++)
      temPaths[i] = [];
    while (con) {
      con = false;
      dirs = dirs.filter(function (dir) {
        var from = dir.from, temPath;
        if (dir.to.length == 0) {
          temPath = temPaths[from];
          if (!temPath) return false;
          endPaths[from] = temPath.length ? temPath.map(function (p) {
            return [from].concat(p);
          }) : [
            [from]
          ];
          con = !(temPaths[from] = 0);
          return false;
        }
        else
          dir.to = dir.to.filter(function (toIndex) {
            var toEndPaths = endPaths[toIndex];
            if (toEndPaths) {
              temPaths[from] = temPaths[from].concat(toEndPaths);
              return !(con = true);
            }
            return true;
          });
        return true;
      });
    }
    if (dirs.length) {
      cir = this.detectCircle(dirs).map(function (i) {
        return vers[i];
      });
      if (circleCollector instanceof Array) circleCollector.push.apply(circleCollector, cir);
      else throw Error('circle detected:' + cir.join('->'));
    }
    return this.convertPathsData(this.mergePaths(endPaths.reduce(function (pre, arr) {
      pre.push.apply(pre, arr);
      return pre;
    }, [])));
  }
};
ChangeSS.Graph = Graph;
ChangeSS.validateMix_Ext = (function () {
  function getScope(ext, scope, graph) {
    var sheet, r, name, sheetName;
    ext = ext.split('->');
    name = ext[0];
    sheet = ChangeSS.get((sheetName = ext[1] || ''));
    if (sheet) r = sheet.scopes.filter(function (c) {
      return c.selector == name
    });
    if (!r || !r.length)
      throw Error('can not find:' + name + sheetName ? ('->' + sheetName) : '');
    r.forEach(function (base) {
      graph.addEdge(scope, base);
    });
    return r;
  }

  function collectExt(scope, graph) {
    scope.exts.map(function (ext) {
      return getScope(ext, scope, graph);
    });
    scope.nested.forEach(function (s) {
      collectExt(s, graph)
    });
    return graph;
  }

  function handleExtPath(path) {
    for (var i = 0, superScope = path[i], base = path[i + 1]; base; superScope = path[++i], base = path[i + 1])
      List.arrayAdd(base.selectors, superScope.selector);
    return path;
  }

  function handleExt(sheets) {
    var graph = new Graph(), paths;
    sheets.forEach(function (sheet) {
      sheet.scopes.forEach(function (s) {
        collectExt(s, graph)
      });
    });
    // debugger;
    paths = graph.getPaths();
    paths.forEach(handleExtPath);
  }

  return function (sheets) {
    handleExt(sheets);
    return sheets;
  }
})();