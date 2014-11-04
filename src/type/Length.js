/**
 * Created by 柏然 on 2014/11/1.
 */
function Length(str) {
  if (!(this instanceof Length)) return new Length(str);
  var m;
  if (!isNaN(str)) {
    this.num = parseFloat(str);
    this.unit = '';
  }
  if (typeof str == "string") {
    m = str.match(/^\-?((\d+(\.\d+)?)|(\.\d+))/);
    if (m) {
      this.num = parseFloat(m[0]);
      this.unit = str.substr(m[0].length);
    }
    else return str;
  }
}
Length.parse = function (str, unit) {
  if (str instanceof Length) return str.clone();
  var l = new Length(str);
  if (unit !== undefined) l.unit = unit.trim();
  return isNaN(l.num) ? undefined : l;
};
Length.toFixed = function (num, fractionalDititals) {
  var m = Number(num).toFixed(fractionalDititals || Length.fractionalDigitals).match(/^\-?\d+(\.(0*[1-9])+)?/);
  return m ? m[0] : NaN;
};
Length.fractionalDigitals = 4;
Length.convertTable = {
  rad: {
    pi: function (n) {
      return n / Math.PI;
    },
    deg: function (n) {
      return n / Math.PI * 180;
    }
  },
  deg: {
    pi: function (n) {
      return n / 180;
    },
    rad: function (n) {
      return n / 180 * Math.PI;
    }
  },
  pi: {
    rad: function (n) {
      return n * Math.PI;
    },
    deg: function (n) {
      return n * 180;
    }
  }
};
Length.prototype = {
  _type: ChangeSS.TYPE.LENGTH,
  clone: function () {
    return new Length(this.num + this.unit);
  },
  opt: function (opt, exp) {
    var num, unit = this.unit, otherUnit = exp.unit;
    if (!exp) return this.clone();
    if (otherUnit && unit !== otherUnit)
      num = exp.convert(otherUnit, unit);
    else num = exp.num;
    unit = unit || otherUnit;
    switch (opt) {
      case '+':
        return new Length(this.num + num + unit);
      case '-':
        return new Length(this.num - num + unit);
      case '*':
        return new Length(this.num * num + unit);
      case '/':
        return new Length(this.num / num + unit);
      default :
        throw  'unkonwn optor:' + opt;
    }
  },
  convert: function (otherUnit, thisUnit) {
    var num = this.num, func = Length.convertTable[(thisUnit || this.unit).toLowerCase()];
    if (func && (func = func[otherUnit.toLowerCase()]))return func(num);
    return num;
  },
  toString: function () {
    return isNaN(this.num) ? 'NaN' : (Length.toFixed(this.num) + this.unit);
  },
  reduce: function () {
    return this;
  },
  resolve: function () {
    return this.clone();
  },
  get value() {
    return this.toString();
  }
};
ChangeSS.Length = Length;