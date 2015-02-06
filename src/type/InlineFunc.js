/**
 * Created by 柏然 on 2014/11/1.
 */
function InlineFunc(name, paramList) {
  if (!(this instanceof InlineFunc))return new InlineFunc(name, paramList);
  this.name = name;
  this.param = paramList?(paramList instanceof List? paramList:new List(paramList)):new List();
}
var userDefinedFunc=InlineFunc.Func = {};
InlineFunc.prototype = {
  _type: ChangeSS.TYPE.FUNC,
  get hasVars(){
    return this.param.hasVars;
  },
  getVar: function (array) {
    return this.param.getVar(array);
  },
  resolve: function ($vars, info) {
    var v = this.param.resolve($vars, info), func, name = this.name, ret;
    func = InlineFunc.Func[name];
    if (!(v instanceof List))v = new List(v);
    if (func && v.canResolve($vars)){
      try{
        ret=func.apply(ChangeSS, v.filter(filterComma));
        ret=Length.parse(ret)||ret;
      }
      catch (ex){
        ret=ex.message;
      }
      if(ChangeSS.getType(ret,true)==TYPE.NONE){
        log('function:'+name+' return :'+ret+' with arguments:'+ v.join(' '));
        return ret+'';
      }
      return ret;
      function filterComma(item){
        //fun(a,b)->arguments:[a,',',b] filter comma
        return item !=','
      }
    }
    ret = new InlineFunc(this.name, v);
    return v.hasVars ? ret : ret.toString();
  },
  reduce: function () {
    var p = this.param.resolve();
    this.param = p instanceof List ? p : new List(p);
    return this;
  },
  clone: function () {
    var p = this.param;
    return new InlineFunc(this.name, p.clone ? p.clone() : p);
  },
  canResolve: function ($vars) {
    var p = this.param;
    return typeof p == "string" ? true : p.canResolve($vars);
  },
  toString: function () {
    return this.name + this.paramString;
  },
  get paramString() {
    var v = this.param.toString();
    return '(' + v.replace(/\s+\,\s*/g, ',') + ')';
  }
};
objForEach({
  'sin,cos,tan':{
    args:function(args){return args[0].convert('rad')},
    res:parseFloat
  },
  'asin,acos,atan':{
    res:function(len){
      len.convert(len.unit = 'deg', 'rad');
      return len;
    }
  }
},function(opt,keys){keys.split(',').forEach(function(key){defineMathFunc(opt,key)})});
objForEach(Math,defineMathFunc);
function defineFunction(name,func){
 if(typeof name=="function"){
   func=name;
   name=func.name;
 }
  if(typeof func!=="function"||!name)throw Error('argument not provided');
  return userDefinedFunc[name]=func;
}
function defineMathFunc(opt,name){
  opt=opt||{};
  var MathFun=Math[name],convertArgs=opt.args||mapArg,convertResult=opt.res||useFirstArgUnit;
  if(typeof MathFun==="function"&&!userDefinedFunc[name])
    defineFunction(name,function(){
      var args=convertArgs(arguments);
      if(!(args instanceof Array))args=[args];
      return convertResult(MathFun.apply(Math,args),arguments);
    });
  function mapArg(args){
    return arrMap(args,'num');
  }
  function useFirstArgUnit(item,args){return Length.parse(item,args[0].unit||'')}
}
ChangeSS.InlineFunc = InlineFunc;
ChangeSS.define=defineFunction;


