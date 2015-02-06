/**
 * Created by 柏子 on 2015/2/5.
 */
function Color(rgb,a){
  if(!(this instanceof Color))return new Color(rgb,a);
  if(typeof rgb==="string"&& rgb[0]=='#')return hex2color(rgb);
  if(rgb instanceof Array){
    this.alpha=a==undefined?1:len2num(a,1);
    this.rgb=rgb.slice(0,3).map(len2num);
  }
}
ChangeSS.Color=Color;
Color.parse=function(hex){
  return (typeof hex=="string"&&hex[0]=='#')? hex2color(hex):undefined;
};
function len2num(num,asFloat){
  if(num instanceof Length) return num.unit=='%'? num.num/100:num.num;
  else if(typeof num!=Number) return asFloat? parseFloat(num):parseInt(num);
  return num;
}
function clamp(v, min,max) {
  min=min||0;
  if(max==undefined)max=1;
  return v<min? min:(v>max? max:v);
}
function hex2color(hex){
  var rgb=new Array(3);
  if(/#[a-f0-9]{6}/.test(hex)){
    for(var off=0;off<3;off++)
      rgb[off]=parseInt(hex.substr(1+off*2,2),16);
  }
  else if(/#[a-f0-9]{3}/i.test(hex)){
    for(var i= 1,char=hex[i];i<4;char=hex[++i])
      rgb[i-1]=parseInt(char+char,16);
  }
  else throw Error('invalid hex color');
  return new Color(rgb,1);
}
function hsla(h,s,l,a){
  if(typeof h=="object"){
    s= h.s;
    l= h.l;
    a= h.alpha;
    h= h.h;
  }
  function hue(h) {
    h = h < 0 ? h + 1 : (h > 1 ? h - 1 : h);
    if      (h * 6 < 1) { return m1 + (m2 - m1) * h * 6; }
    else if (h * 2 < 1) { return m2; }
    else if (h * 3 < 2) { return m1 + (m2 - m1) * (2 / 3 - h) * 6; }
    else                { return m1; }
  }
  h = (h % 360) / 360;
  s = clamp(s);
  l = clamp(l);
  a = a==undefined? 1:clamp(a);
  var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
  var m1 = l * 2 - m2;
  return new Color([hue(h + 1 / 3) * 255,hue(h)* 255,hue(h - 1 / 3) * 255],a);
}
Color.formKeyword=function(key){
  throw Error('do not support');
};
// from less.js
objForEach({
  rgba:function(r,g,b,a){
    return new Color([r,g,b],a==undefined?1:a);
  },
  rgb:function(r,g,b){
    return new Color([r,g,b],1)
  },
  hsl:function(h,s,l){
    return hsla(h,s,l,1)
  },
  hsla:hsla,
  darken: function (color, amount) {
    var hsl = color.toHSL();
    hsl.l = clamp(hsl.l-amount.num/100);
    return hsla(hsl);
  },
  desaturate: function (color, amount) {
    var hsl = color.toHSL();
    hsl.s = clamp(hsl.s-amount.num/100);
    return hsla(hsl);
  },
  saturate: function (color, amount) {
    // filter: saturate(3.2);
    // should be kept as is, so check for color
    if(color instanceof Length)return color;
    var hsl = color.toHSL();
    hsl.s = clamp(hsl.s+ amount.num/ 100);
    return hsla(hsl);
  },
  lighten: function (color, amount) {
    var hsl = color.toHSL();
    hsl.l = clamp(hsl.l+amount.num / 100);
    return hsla(hsl);
  }
},function(func,name){defineFunction(name,func)});
Color.prototype={
  _type:TYPE.KEYWORD,
  toHSL:function(){
   var r = this.rgb[0] / 255,
     g = this.rgb[1] / 255,
     b = this.rgb[2] / 255;
   var max = Math.max(r, g, b), min = Math.min(r, g, b);
   var h, s, l = (max + min) / 2, d = max - min;
   if (max === min) {
     h = s = 0;
   } else {
     s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
     switch (max) {
       case r: h = (g - b) / d + (g < b ? 6 : 0); break;
       case g: h = (b - r) / d + 2;               break;
       case b: h = (r - g) / d + 4;               break;
     }
     h /= 6;
   }
   return { h: h * 360, s: s, l: l, alpha: this.alpha};
 },
  toHex:function(){
    return '#' + this.rgb.map(function (c) {
        c=parseInt(c);
        return (c < 16 ? '0' : '') + c.toString(16);
      }).join('');
  },
  toRGBA:function(){
    return 'rgba('+this.rgb.join(',')+','+this.alpha+')';
  },
  resolve:function(){
    return new Color(this.rgb,this.alpha);
  },
  reduce:function(){return this},
  get hasVars(){return false},
  get value(){return this.toString()},
  toString:function(){
    return this.alpha==1?this.toHex():this.toRGBA();
  }
};