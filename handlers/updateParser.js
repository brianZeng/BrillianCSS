/**
 * Created by 柏然 on 2014/10/22.
 */
var Promise=require('bluebird'),path=require('path'),fs=require('fs'),dir,jison=require('jison'),asyncFS=Promise.promisifyAll(fs);

dir={
  bssPath:path.normalize('public/stylesheets/bss/'),
  grammarPath:path.normalize('src/grammar'),
  bootstrapTestPath:path.normalize('bootstrap_BSS'),
  interpreterPath:path.normalize('src/interpreter.js'),
  testPath:path.normalize('public/stylesheets/test.scss'),
  libDir:path.normalize('style_lib'),
  srcPath:['ChangeSS','Length','Var','Exp','InlineFunc','Color','List','Scope','resolver','Sheet','linker','MediaQuery'].map(function(file){return path.normalize('src/type/'+file+'.js')})
};
module.exports=function(req,res,next){
  readBSS().then(function(data){
    res.locals.bssInput=data;
   return writeFilePromise(path.normalize('public/stylesheets/all.bss'),data,'utf8');
  }).then(generateParser).then(readTest).then(function(data){
    res.locals.testInput=data;
  }).then(function(){ next(); },function(err){next(err);})
};
module.exports.readBootstrapTest=function(){
  var names=[];
  return readDirFilesPromise(dir.bootstrapTestPath,names).then(function(contents){
    return contents.map(function(c,i){ return {name:names[i],content:c} })
  });
};
module.exports.readLib=function(){
  return readDirFilesPromise(dir.libDir).then(function(files){
    return files.join('');
  });
};
module.exports.asyncFS=asyncFS;
function readTest(){
  return asyncFS.readFileAsync(dir.testPath);
}
function readDirFilesPromise(dirPath,namesArray){
  var defer=Promise.defer();
  fs.readdir(dirPath,function(error,names){
    if(names&&namesArray) namesArray.push.apply(namesArray,names);
    return error? defer.reject(error):defer.resolve(names.map(function(name){return path.join(dirPath,name)}));
  });
  return defer.promise.then(readFilesPromise);
}
function readBSS(separator){
  separator=separator||'\n';
  return readDirFilesPromise(dir.bssPath).then(function(datas){return datas.join(separator)});
}
function writeFilePromise (path,data,opt){
  var defer=Promise.defer();
  fs.writeFile(path,data,opt,function(err,data){
    return err? defer.reject(err):defer.resolve(data);
  });
  return defer.promise;
}
function readFilePromise(path,opt){
  return asyncFS.readFileAsync(path,opt||'utf8');
  /*var defer=Promise.defer();
  fs.readFile(path,opt,function(err,data){
    return err? defer.reject(err):defer.resolve(data);
  });
  return defer.promise;*/
}
function readFilesPromise(names){
  return Promise.all(names.map(function(path){
    return readFilePromise(path,'utf8');
  }));
}
function readSrcFiles(){
  return readFilesPromise(dir.srcPath).then(function(data){
     return data.join('');
  });
}
function generateParser(){
  return Promise.all([readFilePromise(dir.grammarPath),readSrcFiles()]).then(function(data){
   var generator=new jison.Jison.Generator(data.join(''),{'case-insensitive':true}),source=generator.generate();
   source=source.substr(0,source.indexOf('if (typeof require !=='));

    return writeFilePromise(path.normalize('public/js/parser.js'),source.replace(/\;\s+\,/g,';'),'utf8').then(function(){
      return generator;
    });
  });
}
