/**
 * Created by 柏然 on 2014/11/6.
 */

function Graph() {
  this.vertexes = this.createList();
  this.adjustList = this.createList();
}
Graph.prototype = {
  createList: (function () {
    function arrAdd(item) {
      var i = this.indexOf(item);
      if (i > -1)return false;
      this.push(item);
      return true;
    }

    function arrRemove(item) {
      var i = this.indexOf(item);
      if (i > -1) {
        this.splice(i, 1);
        return true;
      }
      return false;
    }

    return function (arr) {
      arr = arr || [];
      arr.add = arrAdd;
      arr.remove = arrRemove;
      return arr;
    }
  })(),
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
describe('graph behaviors', function () {
  var g = new Graph();

  function sp(str) {
    return str.split(',');
  }

  function getGraph() {
    g = new Graph();
    g.addVertex.apply(g, sp('a,b,c,d,e,f'));
    return g;
  }

  describe('basic behaviors:', function () {
    it('addEdge', function () {
      g.addEdge('a', 'b');
      g.addEdge('a', 'c');
      g.addEdge('d', 'c');
      expect(g.vertexes).toEqual(['a', 'b', 'c', 'd']);
      expect(g.adjustList[0]).toEqual([1, 2]);
      expect(g.adjustList[g.vertexIndex('d')]).toEqual([g.vertexIndex('c')]);
      expect(g.adjustVertexes('a')).toEqual(['b', 'c']);
      g.removeEdge('a', 'b');
      expect(g.adjustVertexes('a')).toEqual(['c']);
      g = new Graph();
      g.addVertex.apply(g, sp('a,b,c,d,e,f'));
      expect(g.vertexes.length).toBe(6);
    });
    it('can get paths', function () {
      g = new Graph().addEdge('a', 'b');
      expect(g.mergePaths([
        [1, 0],
        [0]
      ])).toEqual([
        [1, 0]
      ]);
      expect(g.mergePaths([
        [0],
        [2, 1, 0],
        [1, 0]
      ])).toEqual([
        [2, 1, 0]
      ]);
      expect(g.mergePaths([
        [0],
        [1],
        [2, 0],
        [2, 1]
      ])).toContain([2, 0], [2, 1]);
      expect(g.mergePaths([
        [0],
        [2, 1],
        [3, 2, 1]
      ])).toContain([0], [2, 1], [3, 2, 1]);
      expect(g.mergePaths([
        [0, 1],
        [0]
      ])).toContain([0, 1], [0]);
      //debugger;
      expect(g.getPaths()).toContain(['a', 'b']);
      g.addEdge('b', 'c');
      expect(g.getPaths()).toEqual([
        ['a', 'b', 'c']
      ]);
      g.addEdge('a', 'c');
      expect(g.getPaths()).toContain(['a', 'b', 'c'], ['a', 'c']);
      g.removeEdge('a', 'c');
    });
  });
  describe('generate DAG and find one circle', function () {
    it('one source one destination DAG', function () {
      getGraph();
      /*
       * a->f
       * b->c  c->e  e->f
       * d->e
       * expect:
       * a->f
       * b->c->e->f
       * d->e->f
       * */
      g.addEdge('a', 'f').addEdge('d', 'e').addEdge('b', 'c');
      expect(g.getPaths()).toContain(sp('a,f'), sp('d,e'), sp('b,c'));
      g.addEdge('c', 'e').addEdge('e', 'f');
      expect(g.getPaths().length).toBe(3);
      expect(g.getPaths()).toContain(sp('a,f'), sp('b,c,e,f'), sp('d,e,f'));
    });
    it('one source multiple destinations DAG', function () {
      getGraph();
      /*
       a->b b->c b->f
       a->d
       a->e e->d
       expect:
       a->d
       a->b->c
       a->b->f
       a->e->d
       */
      g.addEdge('a', 'b').addEdge('b', 'c').addEdge('b', 'f').addEdge('a', 'd').addEdge('a', 'e').addEdge('e', 'd');
      expect(g.getPaths().length).toBe(4);
      expect(g.getPaths()).toContain(['a', 'd'], sp('a,b,c'), sp('a,b,f'), sp('a,e,d'));
    });
    it('multiple des multiple src DAG', function () {
      getGraph();
      /*
       a->c b->c c->d d->f c->e e->f
       expect:
       a->c->e->f
       b->c->e->f
       a->c->d->f
       b->c->d->f
       */
      g.addEdges(sp('a,c,b,c,c,d,d,f,c,e,e,f'));
      expect(g.getPaths().length).toBe(4);
      expect(g.getPaths()).toContain(sp('a,c,e,f'), sp('b,c,e,f'), sp('a,c,d,f'), sp('b,c,d,f'));
    });
    it('find the circle path', function () {
      var collector = [];
      getGraph();
      g.addEdges(sp('a,b,b,c,c,a'));
      g.getPaths(collector);
      expect(collector).toEqual(sp('a,b,c,a'));
      getGraph();
      g.addEdge('a', 'a');
      g.getPaths(collector = []);
      expect(collector).toEqual(['a', 'a']);
    });
    it('find DAG and one circle', function () {
      var collector = [];
      getGraph();
      /*
       a->f f->e e->a
       a->c c->e
       a->b b->d
       */
      g.addEdges(sp('a,f,f,e,e,a,a,c,c,e,a,b,b,d'));
      expect(g.getPaths(collector)).toContain(['b', 'd']);
      console.log(collector);
      expect(collector.length).toBe(4);
    });
  })
});