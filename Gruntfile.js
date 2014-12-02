/**
 * Created by 柏然 on 2014/10/21.
 */
module.exports=function(grunt){
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
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