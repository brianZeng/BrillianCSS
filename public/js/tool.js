/**
 * Created by 柏然 on 2014/10/30.
 */
(function(exporter){
  function inherit(constructor,baseproto,expando,propertyObj){
    if(typeof  baseproto=="function")baseproto=new baseproto();
    baseproto=baseproto||{};
    var proto= constructor.prototype=Object.create(baseproto),proDes;
    if(expando)
      for(var i in expando){
        proDes=Object.getOwnPropertyDescriptor(expando,i);
        if(proDes) Object.defineProperty(proto,i,proDes);
        else
          proto[i]=expando[i];
      }
    if(propertyObj)
      obj.forEach(propertyObj,function(key,value){
        Object.defineProperty(proto,key,value);
      });
    return constructor;
  }
  function array(arraylike,unique){
    if(!(this instanceof array)) return new array(arraylike,unique);
    var fun=unique? 'add':'push';
    for(var i= 0,len=arraylike?arraylike.length||0:0;i<len;i++)
      this[fun](arraylike[i]);
  }
  function mapProName(proNameOrFun){
    if(typeof proNameOrFun== "function")return proNameOrFun;
    else if(proNameOrFun&&typeof proNameOrFun =="string")
      return function(item){return item? item[proNameOrFun]:undefined;};
    else return function(item){return item; }
  }
  function sliceArguments(arg){
    return Array.prototype.slice.apply(arg,[0]);
  }

  array.desAdd=function(array,item,proName){
    if (array.indexOf(item) >= 0)return false;
    var len=array.length;
    for (var i= len- 1,func=mapProName(proName), it = array[i]; it; it = array[--i])
      if (func(item) <= func(it))break;
    return !!array.splice(i+1,0,item);
  };
  array.ascAdd=function(array,item,proName){
    if (array.indexOf(item) >= 0)return false;
    var len=array.length;
    for (var i= len- 1,func=mapProName(proName), it = array[i]; it; it = array[--i])
      if (func(item) >= func(it))break;
    return !!array.splice(i+1,0,item);
  };
  array.max=function(array,proNameOrFun){
    var fun=mapProName(proNameOrFun);
    for(var i= 0,m=array[0],funm=fun(m),funCur=funm,cur=array[0];cur;cur=array[++i])
      if((funCur=fun(cur))>funm){
        m=cur;funm=funCur
      }
    return m;
  };
  array.min=function(array,proNameOrFun){
    var fun=mapProName(proNameOrFun);
    for(var i= 0,m=array[0],funm=fun(m),funCur=funm,cur=array[0];cur;cur=array[++i])
      if((funCur=fun(cur))<funm){
        m=cur;funm=funCur
      }
    return m;
  };
  array.remove=function(array,item){
    var i = array.indexOf(item);
    if (i >= 0)
      return !!array.splice(i, 1);
    return false;
  };
  array.removeAll=function(arr){
    for(var r=true,remove=array.remove,i= 1,len=arguments.length;i<len;i++)
      r &=remove(arr,arguments[i])
    return r;
  };
  array.add=function(array,item){
    var i = array.indexOf(item);
    if (i ==-1)
      return !!array.push(item);
    return false;
  };
  array.addAll=function(arr){
    for(var r=true,add=array.add,i= 1,len=arguments.length;i<len;i++)
      r &=add(arr,arguments[i])
    return r;
  };
  array.des=function(array,proNameOrFun){
    var fun=mapProName(proNameOrFun);
    array.sort(function(a,b){ return fun(a)>fun(b)? -1 : 1;})
  };
  array.asc=function(array,proNameOrFun){
    var fun=mapProName(proNameOrFun);
    array.sort(function(a,b){ return fun(a)>fun(b)? 1 : -1;})
  };
  array.findBy=function(array,proNameOrFun,value,unstrict){
    var fun=mapProName(proNameOrFun), i,item;
    if(unstrict){
      for (i = 0, item = array[0]; item; item = array[++i]) if(fun(item)==value)return item;
    }
    else{
      for (i = 0, item = array[0]; item; item = array[++i]) if(fun(item)===value)return item;
    }
    return undefined;
  };
  array.findAllBy=function(array,proNameOrFun,value,unstrict){
    var fun=mapProName(proNameOrFun),filterFun=unstrict?
      function(item){return fun(item)==value;}:
      function(item){return fun(item)===value;};
    return array.filter(filterFun);
  };
  array.contains=function(array){
    for(var i= 1,len=arguments.length;i<len;i++)
      if(array.indexOf(arguments[i])==-1)return false;
    return true;
  };
  inherit(array,Array,{
    copy:function(from,deep,overWrite,copyBase){
      for(var i= 0,item=this[i];item;item=this[++i])
        obj.copy(item,from[i],deep,overWrite,copyBase);
      return this;
    },
    copyArray:function(array){
      for(var i= 0,alen=array.length,tlen=this.length,mlen=alen>tlen? alen:tlen;i<mlen;i++)
        if(i<alen) this[i]=array[i];
        else delete this[i];
      this.length=alen;
      return this;
    },
    desAdd:function(item,proName){
      return array.desAdd(this,item,proName);
    },
    ascAdd:function(item,proName){
      return array.ascAdd(this,item,proName);
    },
    max:function(proNameOrFun){
      return array.max(this,proNameOrFun);
    },
    min:function(proNameOrFun){
      return array.min(this,proNameOrFun);
    },
    remove:function(item){
      return array.remove(this,item);
    },
    add:function(item){
      return array.add(this,item);
    },
    des:function(proNameOrFun){
      return array.des(this,proNameOrFun);
    },
    asc:function(proNameOrFun){
      return array.asc(this,proNameOrFun);
    },
    findBy:function(proNameOrFun,value,unstrict){
      return array.findBy(this,proNameOrFun,value,unstrict);
    },
    findAllBy:function(proNameOrFun,value,unstrict){
      return new array(array.filter(this,proNameOrFun,value,unstrict));
    },
    mapBy :(function () {
      function addToMap(obj, name, item) {
        var a = obj[name];
        if (!a)a = obj[name] = [];
        a.add(item);
        return a;
      }
      return function (proNameOrFun) {
        var func = mapProName(proNameOrFun);
        for (var i = 0, map = {}, item = this[0]; item; item = this[++i])
          addToMap(map, func(item), item);
        return map;
      }
    })(),
    groupBy :function (proNameOrFunc) {
      var map=this.mapBy(proNameOrFunc);
      return Object.getOwnPropertyNames(map).map(function(name){return this[name];});
    },
    contains:function(){
      return array.contains.apply(this,[Array.prototype.unshift.apply(arguments,[this])]);
    },
    addAll:function(){return sliceArguments(arguments).filter(this.add,this).length;},
    removeAll:function(){return sliceArguments(arguments).filter(this.add,this).length;},
    filter:function(){return this.copyArray(Array.prototype.filter.apply(this,sliceArguments(arguments))); },
    concat:function(){return new array(Array.prototype.concat.apply(Array.prototype.slice.apply(this),[sliceArguments(arguments)]))},
    slice:function(){return new array(Array.prototype.slice.apply(this,sliceArguments(arguments)))},
    splice:function(){return new array(Array.prototype.splice.apply(this,sliceArguments(arguments)))},
    map:function(){return new array(Array.prototype.map.apply(this,sliceArguments(arguments)))},
    reduce:function(){return new array(Array.prototype.reduce.apply(this,sliceArguments(arguments)))}
  });
  function obj(object,deep,copyBase){
    if(!(this instanceof obj))return new obj(object);
    if(object!==undefined)
      obj.copy(this,object,deep,true,copyBase);
  }
  obj.copy=function(target,from,deep,overWrite,copyBase){
    var v;
    for(var i in from)
      if((from.hasOwnProperty(i)||copyBase)&&(overWrite||!target.hasOwnProperty(i)))
      {
        v=from[i];
        if(typeof v== "object"&& deep)
          v=typeof v.copy=="function"? v.copy(from,true,overWrite,copyBase):obj.copy({},v,from,true,overWrite,copyBase);
        target[i]=v;
      }
    return target;
  };

  obj.forEach = function (object,callback,arg) {
    for (var i = 0, names = Object.getOwnPropertyNames(object), name = names[0]; name; name = names[++i])
      callback.apply(object, [name,object[name],arg]);
    return object;
  };
  obj.map=function(object,callback,arg){
    var r=new obj();
    for(var keys=Object.getOwnPropertyNames(object),i= 0,key=keys[0];key;key=keys[++i])
      r[key]=callback.apply(object,[key,object[key],arg]);
    return r;
  };
  obj.filter=function(object,callback,arg){
    var r=new obj();
    for (var i = 0, names = Object.getOwnPropertyNames(object),value, name = names[0]; name; name = names[++i])
      if(callback.apply(object, [name,value=object[name],arg]))r[name]=value;
    return r;
  };
  obj.reduce=function(object,callback,initialValue,arg){
    for(var keys=Object.getOwnPropertyNames(object),i= 0,key=keys[0];key;key=keys[++i])
      initialValue= callback.apply(object,[initialValue,key,object[key],arg]);
    return initialValue;
  };
  obj.concat=(function(){
    function defCallback(key,sourceValue){
      return sourceValue;
    }
    return function(des,source,callback,arg){
      callback=callback||defCallback;
      var r=new obj();
      for(var keys=Object.getOwnPropertyNames(source),key=keys[0],i=0;key;key=keys[++i])
        r[key]=callback.apply(des,[key,source[key],des[key],arg]);
      return r;
    };
  })();
  inherit(obj,null,{
    on :function (evtName, handler) {
      if (typeof evtName == "string" && evtName && typeof handler == "function"){
        var cbs, hs;
        if (!this.hasOwnProperty('_callbacks'))this._callbacks = cbs ={};
        else cbs = this._callbacks;
        if (!(hs=cbs[evtName]))hs=cbs[evtName] = [];
        array.add(hs,handler);
      }
      return this;
    },
    emit:(function(){
      var emitings=array();
      return function (evtName, argArray, thisObj) {
        var cbs = this._callbacks, hs, r,nhs;
        if (!cbs)return 0;
        hs = cbs[evtName];
        if (!hs ||!emitings.add(hs))return false;
        if (!argArray)argArray =[];
        else if (!(argArray instanceof Array)) argArray = [argArray];
        thisObj = thisObj || this;
        nhs=cbs[evtName] = hs.filter(function (call) {
          r = call.apply(thisObj, argArray);
          return r != -1;
        });
        emitings.remove(hs);
        return nhs.length;
      }
    })(),
    listening:function(evtName){
      var hs=this.listeners(evtName);
      return hs && hs.length;
    },
    listeners:function(evtName){
      var cbs,hs;
      return this.hasOwnProperty('_callbacks')&& (cbs=this._callbacks) && (hs=cbs[evtName])? hs:null;
    },
    off:function(evtName,handler){
      var cbs,hs;
      if((cbs=this._callbacks)&&(hs=cbs[evtName])&&hs){
        if(handler) array.remove(hs,handler);
        else delete cbs[evtName];
      }
      return this;
    },
    copy:function(from,deep,overWrite,copyBase){
      return obj.copy(this,from,deep,overWrite,copyBase);
    },
    once:function(evtName,handler){
      if(typeof handler== "function"){
        this.on(evtName,function(){
          handler.apply(this,arguments);
          return -1;
        });
      }return this;
    },
    forEach : function (callback,arg) {return obj.forEach(this,callback,arg);},
    map:function(callback,arg){return obj.map(this,callback,arg)},
    filter:function(callback,arg){return obj.filter(this,callback,arg);},
    reduce:function(callback,initialValue,arg){return obj.reduce(this,callback,initialValue,arg)},
    concat:function(source,callback,arg){return obj.concat(this,source,callback,arg)}
  });
  obj.inherit=inherit;

  function XHR(url, method, options) {
    if(!(this instanceof  XHR))return new XHR(url,method,options);
    options = options || XHR.createOptions('json', 'application/json', false, false);
    var xhr = new XMLHttpRequest();
    this.xhr = xhr;
    this.responseType = options.responseType;
    xhr.onreadystatechange = this.xhrStateChange.bind(this, xhr);
    xhr.onerror = this.xhrError.bind(this, xhr);
    this.contentType = options.contentType;
    this.withCredentials = options.withCredentials;
    this.startTime = this.endTime = null;
    this.notifyLoading = options.notifyLoading;
    this.url = url;
    this.method = method || 'get';
  }
  inherit(XHR,obj,{
      xhrError: function (xhr, error) {
        this.endTime = Date.now();
        this.emit('error', [xhr, error]);
      },
      abort: function () {
        this.xhr.abort();
        this.emit('abort', [this.xhr]);
      },
      xhrStateChange: function (xhr) {
        switch (xhr.readyState) {
          case 1://XMLHttpRequest.OPENED:
            xhr.responseType = this.responseType;
            xhr.overrideMimeType(this.contentType);
            // if (xhr.hasOwnProperty('withCredentials'))
            //     xhr.withCredentials = this.withCredentials;
            this.emit('opened', [xhr]);
            break;
          case 2://XMLHttpRequest.HEADERS_RECEIVED:
            this.emit('headers', [xhr]);
            break;
          case 3://loading
            if (this.notifyLoading)
              this.emit('loading', [xhr]);
            break;
          case 4:
            if (xhr.status == 200)
              this.emit('success', [xhr]);
            else
              this.emit('fail', [xhr]);
            this.emit('done', [xhr]);
            break;
        }
      },
      _autoSend: function () {
        this.send()
      },
      get timeUsed() {
        return (this.endTime || Date.now() - this.startTime) / 1000 || undefined;
      },
      get timeOut() {
        return this._timeOut;
      },
      set timeOut(t) {
        if (t < 0 || isNaN(t))return;
        this._timeOut = t;
      },
      get isSent() {
        return this._isSent || this.xhr.readyState > 1;
      },
      setQuery: function (key, value) {
        var q = this.query;
        if (!q)this.query = q = {};
        q[key] = value;
        return this;
      },
      get queryString() {
        var q = this.query, keys;
        if (!q)return '';
        keys = Object.getOwnPropertyNames(q);
        if (!keys.length)return'';
        for (var i = 0, key = keys[i], str = '?'; key; key = keys[++i])
          str += (encodeURIComponent(key) + '=' + encodeURIComponent(q[key]) + '&');
        return str.substring(0, str.length - 1);
      },
      open: function () {
        this.xhr.open(this.method, this.url + this.queryString);
        this.xhr.setRequestHeader('Content-Type',this.contentType);
        this.send();
        return this;
      },
      send: function (data) {
        if (data !== undefined)this.data = data;
        switch (this.xhr.readyState) {
          case 0:
           return this.open();
          case 1:
            this.startTime = Date.now();
            var d=this.data;
            if(d&&typeof d!=="string") d=JSON.stringify(d);
            this.xhr.send(d || null);
            this._isSent = true;
            if(this._timeOut) setTimeout(function(){
              this.xhr.abort();
            }.bind(this),this._timeOut);
            break;
        }
        return this;
      }
    }
  );
  XHR.createOptions = function (resType, contentType, notifyLoading, withCredentials) {
    return {
      responseType: resType,
      contentType: contentType,
      withCredentials: withCredentials,
      notifyLoading: notifyLoading
    };
  };

  exporter.Object=obj;
  exporter.Array=array;
  exporter.XHR=XHR;
  return exporter;
})(window.ext={});