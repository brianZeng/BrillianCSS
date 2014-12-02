var express = require('express');
var router = express.Router();
var data=require('../bin/data.js');
var fs=require('../handlers/updateParser.js').asyncFS,path=require('path');
var testDir=path.normalize('public/test/');
router.all('/feature/:section',function(req,res,next){
fs.readFileAsync(path.normalize('views/feature/'+req.params.section+'.htm'),'utf8').then(function(data){
    res.type('html');
    res.send(data);
    res.end();
  },function(error){
    next(error);
  });
});
/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express',bss:res.locals.testInput,data:data,test:''});
});
router.get('/test/:file',function(req,res){
  res.render('test',{files:[req.params.file+'.js']});
});
router.get('/test',function(req,res){
  fs.readdirAsync(testDir).then(function(files){
    res.render('test',{files:files||[]});
  });
});


module.exports = router;
