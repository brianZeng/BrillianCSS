/**
 * Created by 柏然 on 2014/10/29.
 */
module.exports={
  header:[
    dataItem('Home','home'),
    dataItem('Demo','demo'),
    dataItem('Git','git')
  ],
  features:[
    dataItem('变量','variable'),
    dataItem('嵌套','nest'),
    dataItem('继承','inherit'),
    dataItem('混入','mixin')
  ],
  feature:'特性'
};
function dataItem(text,name,arg){
  return {text:text||'',name:name,arg:arg}
}
