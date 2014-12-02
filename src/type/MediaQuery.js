/**
 * Created by 柏然 on 2014/11/21.
 */
function MediaQuery(mType, condition) {
  if (!(this instanceof MediaQuery))return new MediaQuery(mType, condition);
  this.mediaTypes = [mType || ''];
  this.conditions = [
    {}
  ];
  this.groupPrefix='@media';
  this.add(condition);
}
MediaQuery.prototype = {
  add: function (pair, mediaType) {
    var i;
    if (mediaType == undefined) i = 0;
    else if ((i = this.mediaTypes.indexOf(mediaType)) == -1)return this;
    if (pair && pair.key)
      this.conditions[i][pair.key] = pair.value;
    return this;
  },
  merge: function (mq) {
    this.mediaTypes = this.mediaTypes.concat(mq.mediaTypes);
    this.conditions = this.conditions.concat(mq.conditions);
    return this;
  },
  apply: function (item) {
    if (item instanceof Array)
      item.forEach(function (i) {
        this.apply(i)
      }, this);
    else if (item instanceof Style) {
      item.media = this;
    }
    return this;
  },
  reduce: function () {
    this.conditions.forEach(function (con) {
      objForEach(con, function (key, v) {
        if(v==undefined)con[key]=v;
        else {
          if (v.resolve)v = v.resolve();
          con[key] = v.hasVars ? v : v.toString();
        }
      });
    });
    this.variables = null;
    return this;
  },
  clone: (function () {
    function cloneObj(obj) {
      var o = {};
      objForEach(obj, function (key, value) {
        o[key] = value.clone ? value.clone() : value
      });
      return o;
    }
    return function () {
      var m = new MediaQuery();
      m.mediaTypes = this.mediaTypes.slice();
      m.conditions = this.conditions.map(cloneObj);
      m.groupPrefix=this.groupPrefix;
      return m;
    }
  })(),
  toString: (function () {
    var MEDIA_AND=' and ';
    function resolveMedia(conMap, $known) {
      var r = [];
      objForEach(conMap, function (key, value) {
        if(value==undefined) r.push('('+key+')');
        else{
          if (value.hasVars)value = value.resolve($known);
          r.push('(' + key + ':' + value + ')');
        }
      });
      return r.join(MEDIA_AND);
    }

    return function ($vars) {
      var $known =$vars? ChangeSS.assign($vars).$resolved:{}, cons = this.conditions;
      return this.groupPrefix+' '+ this.mediaTypes.map(function (m_type, i) {
        var mcon=resolveMedia(cons[i], $known);
        if(m_type)
          return mcon? m_type+MEDIA_AND+mcon:m_type;
        return mcon;
        //return m_type?   m_type+MEDIA_AND+mcon  : mcon;
      }).join(',');
    }
  })(),
  canResolve: function ($vars) {
    return !this.hasVars || this.variables.every(function (v) {
      return v.canResolve($vars)
    });
  },
  get hasVars() {
    var vs = this.variables || (this.variables = this.getVar());
    return vs.length > 0;
  },
  getVar: function (array) {
    array = array || [];
    this.conditions.forEach(function (condition) {
      objForEach(condition, function (key, v) {
        if (v instanceof Var) List.arrayAdd(array, v);
        else if (v.getVar) v.getVar(array);
      });
    });
    return array;
  },
  asKeyFrames:(function(){
    var vendorPrefixes=['o','moz','ms','webkit',''].map(function(pre){
      if(pre)pre='-'+pre+'-';
      return '@'+pre+'keyframes';
    }),normalizePrefixes=['@keyframes'];
    function resolveKeyframes(){
      var prefix;
      if((prefix=this.groupPrefix)===normalizePrefixes[0]){
        if(ChangeSS.opt.addKeyFramesVendorPrefix) return vendorPrefixes;
        return ChangeSS.opt.preferKeyFramesVendorPrefix? ['@-'+ChangeSS.opt.vendorPrefix+'-keyframes']:normalizePrefixes;
      }
      return [prefix]
    }
    return function(prefix){
      this.groupPrefix=prefix;
      this.resolve=resolveKeyframes;
      return this;
    }
  })()
};
MediaQuery.prototype.resolve = function ($vars) {
  return this.canResolve($vars) ? this.toString($vars) : this.clone();
};
ChangeSS.MediaQuery = MediaQuery;