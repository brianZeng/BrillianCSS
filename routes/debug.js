/**
 * Created by 柏然 on 2014/10/27.
 */
var router = require('express').Router();
router.get('/',function(req,res){
  res.render('debug',{title:'Debug',bss:res.locals.testInput});
});
module.exports=router;