/**
 * Created by 柏子 on 2015/2/5.
 */
function Color(rgb,a){
  if(!(this instanceof Color))return new Color(rgb,a);
  if(typeof rgb==="string")
    return rgb[0]=='#'? hex2color(rgb):key2Color(rgb);
  if(rgb instanceof Array){
    this.alpha=a==undefined?1:len2num(a,1);
    this.rgb=rgb.slice(0,3).map(len2num);
  }
}
ChangeSS.Color=Color;
Color.parse=parseColor;
function parseColor(color){
  if(color instanceof Color)return color;
  try{
    return new Color(color);
  }
  catch (e){
   //return undefined
  }
}
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
function key2Color(key){
  var rgb=Color.keywords[key.toLowerCase()];
  if(rgb)return new Color(rgb,1);
  throw Error('invalid color name');
}
function hex2color(hex){
  var rgb=new Array(3);
  hex=hex.toLowerCase();
  if(/#[a-f0-9]{6}/i.test(hex)){
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
var ColorFuncs;
// from less.js
objForEach(ColorFuncs={
  alpha:function(color,alpha){
    color=parseColor(color);
    color.alpha=clamp(alpha);
    return color;
  },
  rgba:function(r,g,b,a){
    if(arguments.length==2)
      return ColorFuncs.alpha(r,g);
    return new Color([r,g,b],a==undefined?1:a);
  },
  transparentize:function(color,a){
    color=parseColor(color);
    color.alpha=clamp(color.alpha-Length.parse(a).num);
    return color;
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
    return 'rgba('+this.rgb.map(Math.round).join(',')+','+this.alpha+')';
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
Color.keywords=(function(input){
  var map={},i;
  input.split(';').forEach(function(colorPair){
    i=colorPair.indexOf(':');
    map[colorPair.substr(0,i)]=colorPair.slice(i+1).split(',')
  });
  return map;
}('aliceblue:240,248,255;antiquewhite:250,235,215;aqua:0,255,255;aquamarine:127,255,212;azure:240,255,255;beige:245,245,220;bisque:255,228,196;black:0,0,0;blanchedalmond:255,235,205;blue:0,0,255;blueviolet:138,43,226;brown:165,42,42;burlywood:222,184,135;cadetblue:95,158,160;chartreuse:127,255,0;chocolate:210,105,30;coral:255,127,80;cornflowerblue:100,149,237;cornsilk:255,248,220;crimson:220,20,60;cyan:0,255,255;darkblue:0,0,139;darkcyan:0,139,139;darkgoldenrod:184,134,11;darkgray:169,169,169;darkgreen:0,100,0;darkgrey:169,169,169;darkkhaki:189,183,107;darkmagenta:139,0,139;darkolivegreen:85,107,47;darkorange:255,140,0;darkorchid:153,50,204;darkred:139,0,0;darksalmon:233,150,122;darkseagreen:143,188,143;darkslateblue:72,61,139;darkslategray:47,79,79;darkslategrey:47,79,79;darkturquoise:0,206,209;darkviolet:148,0,211;deeppink:255,20,147;deepskyblue:0,191,255;dimgray:105,105,105;dimgrey:105,105,105;dodgerblue:30,144,255;firebrick:178,34,34;floralwhite:255,250,240;forestgreen:34,139,34;fuchsia:255,0,255;gainsboro:220,220,220;ghostwhite:248,248,255;gold:255,215,0;goldenrod:218,165,32;gray:128,128,128;green:0,128,0;greenyellow:173,255,47;grey:128,128,128;honeydew:240,255,240;hotpink:255,105,180;indianred:205,92,92;indigo:75,0,130;ivory:255,255,240;khaki:240,230,140;lavender:230,230,250;lavenderblush:255,240,245;lawngreen:124,252,0;lemonchiffon:255,250,205;lightblue:173,216,230;lightcoral:240,128,128;lightcyan:224,255,255;lightgoldenrodyellow:250,250,210;lightgray:211,211,211;lightgreen:144,238,144;lightgrey:211,211,211;lightpink:255,182,193;lightsalmon:255,160,122;lightseagreen:32,178,170;lightskyblue:135,206,250;lightslategray:119,136,153;lightslategrey:119,136,153;lightsteelblue:176,196,222;lightyellow:255,255,224;lime:0,255,0;limegreen:50,205,50;linen:250,240,230;magenta:255,0,255;maroon:128,0,0;mediumaquamarine:102,205,170;mediumblue:0,0,205;mediumorchid:186,85,211;mediumpurple:147,112,219;mediumseagreen:60,179,113;mediumslateblue:123,104,238;mediumspringgreen:0,250,154;mediumturquoise:72,209,204;mediumvioletred:199,21,133;midnightblue:25,25,112;mintcream:245,255,250;mistyrose:255,228,225;moccasin:255,228,181;navajowhite:255,222,173;navy:0,0,128;oldlace:253,245,230;olive:128,128,0;olivedrab:107,142,35;orange:255,165,0;orangered:255,69,0;orchid:218,112,214;palegoldenrod:238,232,170;palegreen:152,251,152;paleturquoise:175,238,238;palevioletred:219,112,147;papayawhip:255,239,213;peachpuff:255,218,185;peru:205,133,63;pink:255,192,203;plum:221,160,221;powderblue:176,224,230;purple:128,0,128;red:255,0,0;rosybrown:188,143,143;royalblue:65,105,225;saddlebrown:139,69,19;salmon:250,128,114;sandybrown:244,164,96;seagreen:46,139,87;seashell:255,245,238;sienna:160,82,45;silver:192,192,192;skyblue:135,206,235;slateblue:106,90,205;slategray:112,128,144;slategrey:112,128,144;snow:255,250,250;springgreen:0,255,127;steelblue:70,130,180;tan:210,180,140;teal:0,128,128;thistle:216,191,216;tomato:255,99,71;turquoise:64,224,208;violet:238,130,238;wheat:245,222,179;white:255,255,255;whitesmoke:245,245,245;yellow:255,255,0;yellowgreen:154,205,50;rebeccapurple:102,51,153'));