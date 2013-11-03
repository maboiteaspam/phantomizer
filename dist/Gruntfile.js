
module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-qunit');


    // phantomizer webserver
    grunt.loadNpmTasks('phantomizer-grunt');

    // specific optimizer tasks
    grunt.loadNpmTasks('phantomizer-manifest');
    grunt.loadNpmTasks('phantomizer-html-builder');
    grunt.loadNpmTasks('phantomizer-html-assets');
    grunt.loadNpmTasks('phantomizer-requirejs');
    grunt.loadNpmTasks('phantomizer-uglifyjs');
    grunt.loadNpmTasks('phantomizer-strykejs');
    grunt.loadNpmTasks('phantomizer-htmlcompressor');
    grunt.loadNpmTasks('phantomizer-imgopt');
    grunt.loadNpmTasks('phantomizer-manifest');
    grunt.loadNpmTasks('phantomizer-gm');

    // document tasks
    grunt.loadNpmTasks('phantomizer-styledocco');
    grunt.loadNpmTasks('phantomizer-docco');

    // test tasks
    grunt.loadNpmTasks('phantomizer-qunit-runner');

    // project export tasks
    grunt.loadNpmTasks('phantomizer-export-build');
    grunt.loadNpmTasks('phantomizer-slim');

    grunt.loadNpmTasks('phantomizer-confess');

    grunt.loadNpmTasks('phantomizer-websupport');

};
