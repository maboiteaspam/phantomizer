# phantomizer v0.1.x

> Provides an environment to develop, run and build Phantomizer projects

phantomizer embeds popular tools all together
to provide an unified and easy to use html development environment.

It includes several ready to use / configure task oriented toward web development requirements,
- minification with requirejs, uglifyjs, htmlcompressor
- image optimization
- image spriting
- html manifest support
- test with qunit
- documentation with docco and doccostyle
- export project task
- mobile device preview
- bandwidth and network latency perturbators
- qrcode helper
- confess support

# Installation
```bash
npm cache clean
npm uninstall -g grunt-cli
npm install -g grunt-cli
npm uninstall -g maboiteaspam/phantomizer
npm install -g maboiteaspam/phantomizer

phantomizer --init my_project

npm install
```

# Usage
```bash
phantomizer --init <project_dir>

phantomizer --server <project_dir>

phantomizer --test <project_dir>

phantomizer --document <project_dir>

phantomizer --export <project_dir> [export_target]
```

# Start
```bash
phantomizer --init my_project

phantomizer --server my_project
```
Then you can go in my_project/www-core/ to write your web pages.
Notice the my_project/config.json file that lets you adjust the configuration.
my_project/run is the storage folder for phantomizer to build your project
my_project/documentation contains your documented scripts and css
my_project/export contains the exported projet files ready to deploy


# Embedded, thanks to all of them

    https://github.com/jacobrask/styledocco
    https://github.com/jacobrask/docco
    https://github.com/jamesgpearce/confess
    https://github.com/jrburke/requirejs
    https://github.com/mishoo/UglifyJS
    https://github.com/crowjonah/grunt-imgmin
    https://github.com/gruntjs/grunt
    https://github.com/senchalabs/connect
    https://github.com/jquery/jquery
    https://github.com/jquery/qunit
    https://github.com/gruntjs/grunt-contrib-qunit
    ect... more to come later.

# Why ?

Because html rocks, but our tools fails.

## Release History


---

