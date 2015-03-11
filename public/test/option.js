/**
 * Created by Administrator on 2015/3/11.
 */
describe('parse option:',function(){
  var src,res,parseTo=function(opt,result){
    expect(ChangeSS(src,opt||{})).toBe(result)
  };
  it('support compress',function(){
    src='div{ margin:10px }\n\rp{top:20px;left:0;}';
    parseTo({compress:true},res='div{margin:10px;}p{top:20px;left:0;}');
    expect(ChangeSS(src)).not.toBe(res);
    expect(ChangeSS(src).replace(/\n/g,'')).toBe(res);
  })
});