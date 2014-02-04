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
    },
    'gh-pages': {
      options: {
        base: '.',
        add: true
      },
      src: ['documentation/**']
    },
    release: {
      options: {
        // update the package json file version number or not
        bump: true, //default: true
        //file: 'component.json', //default: package.json
        // it is actually git add command
        add: false, //default: true
        // it is actually git commit command
        commit: false, //default: true
        // git tag  command
        // tag: false, //default: true
        // git push  command
        // push: false, //default: true
        // pushTags: false, //default: true
        npm: false, //default: true
        // true will apply the version number as the tag
        npmtag: true, //default: no tag
        // folder: 'folder/to/publish/to/npm', //default project root
        tagName: '<%= version %>', //default: '<%= version %>'
        // commitMessage: 'release <%= version %>', //default: 'release <%= version %>'
        //tagMessage: 'tagging version <%= version %>', //default: 'Version <%= version %>',
        github: {
          repo: 'maboiteaspam/phantomizer', //put your user/repo here
          usernameVar: 'GITHUB_USERNAME', //ENVIRONMENT VARIABLE that contains Github username
          passwordVar: 'GITHUB_PASSWORD' //ENVIRONMENT VARIABLE that contains Github password
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-docco');
  grunt.loadNpmTasks('grunt-gh-pages');
  grunt.loadNpmTasks('grunt-release');

  grunt.registerTask('cleanup-grunt-temp', [],function(){
    var wrench = require('wrench');
    wrench.rmdirSyncRecursive(__dirname + '/.grunt', !true);
    wrench.rmdirSyncRecursive(__dirname + '/documentation', !true);
  });

  // to generate and publish the docco style documentation
  // execute this
  // grunt
  grunt.registerTask('default', ['docco','gh-pages', 'cleanup-grunt-temp']);

  // to release the project in a new version
  // use one of those commands
  // grunt --no-write -v release # test only
  // grunt release:patch
  // grunt release:minor
  // grunt release:major
  // grunt release:prerelease


};