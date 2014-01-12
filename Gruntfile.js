module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        docco: {
            debug: {
                src: [
                    'bin/phantomizer.js'
                ],
                options: {
                    layout:'linear',
                    output: 'documentation/'
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-docco');
    grunt.registerTask('default', ['docco']);

};