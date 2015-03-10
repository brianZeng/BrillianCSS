var fs=require('fs'),path=require('path');

module.exports=function(grunt){
  var interpreter=require('./lib/changess'),libSheets=interpreter.parse(readSrcLib());
  grunt.registerMultiTask('changess','complie Changess Files to css',function(){
   var opt=this.options({keepEmptyResult:false});
    interpreter.opt.keepEmptyResult=opt.keepEmptyResult;
    this.files.forEach(function(f){
      var contents=[];
      f.src.forEach(function(filepath){
        if (!grunt.file.exists(filepath))
          grunt.log.warn('Source file "' + filepath + '" not found.');
        else {
          //grunt.log.writeln(filepath);
          contents.push(grunt.file.read(filepath));
        }
      });
      grunt.file.write(f.dest,interpreter(contents.join(''),{lib:libSheets}));
      grunt.log.writeln('File ' + f.dest + ' created.');
    });
  });
  function readSrcLib(){
    var srcPath='./src',files=fs.readdir(srcPath);
    return files.map(function(file){
      return grunt.file.read(path.join(srcPath,file))
    }).join('');
  }
};