/**
 * Created by 柏然 on 2014/10/21.
 */
module.exports=function(grunt){
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('changess-grunt');
  /*grunt.registerMultiTask('changess','complie Changess Files to css',function(){
    var interpreter=require('./bin/changess');
    var opt=this.options({keepEmptyResult:false});
    interpreter.opt.keepEmptyResult=opt.keepEmptyResult;
    this.files.forEach(function(f){
      var contents=[];
      f.src.forEach(function(filepath){
        if (!grunt.file.exists(filepath))
          grunt.log.warn('Source file "' + filepath + '" not found.');
        else contents.push(grunt.file.read(filepath));
      });
      grunt.file.write(f.dest,interpreter(contents.join('')));
      grunt.log.writeln('File ' + f.dest + ' created.');
    });
  });*/
  grunt.initConfig(
     {
       concat:{
         bss:{
           src:'public/stylesheets/bss/*',
           dest:'public/stylesheets/all.bss'
         },
         jasmine:{
           dest:'public/js/jasmine.js',
           src:['jasmine.js','jasmine-html.js','boot.js'].map(function(s){
              return 'bower_components/jasmine/lib/jasmine-core/'+s;
           })
         },
         program:{
           src:'public/js/parser.js',
           dest:'changess-grunt/tasks/lib/changess.js',
           options:{
             stripBanner:true
           }
         }
       },
       watch:{
         all:{
           files:'public/stylesheets/bss/*',
           tasks:['concat']
         },
         options: {
           livereload: {
             port:3000
           }
         }
       },
       uglify:{
         jasmine:{
           files:{
             'public/js/jasmine.min.js':['public/js/jasmine.js'],
             'public/js/ChangSS.min.js':['public/js/parser.js']
           }
         }

       },
       changess:{
         dev:{
           src:'public/bss/*.scss',
           dest:'public/css/sum.css'
         },
         ford4s:{
           src:'bootstrap_BSS/ford4s/*.scss',
           dest:'bootstrap_BSS/ford4s.css'
         }
       }
     }
   );
  grunt.registerTask('default',['concat','watch','uglify']);

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });
  grunt.event.on('concat', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });
  grunt.event.on('uglify', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });

};