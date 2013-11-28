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
- mobile device emulation preview
- bandwidth and network latency perturbators
- confess support
- qrcode helper
- preselected list of client side javascript libraries to consume

# General assumption
This project assume you want to make web application, and so provides tools to do it.
It assumes that your websites has relatively small list of urls to build.
Indeed that aims to provide support to provide both websites (multi pages / SEO) and webapp (one page).
At that time it builds 500 urls in 2 mins under ubuntu 13 with an intel core i7.

# Client side mandatory
It is mandatory to use phantomizer client side library to successfully build.
At least, it has never been tested and developed without that library included on client side.
That library helps you to take advantage of the differents build stage, you are invited to really use it in all case.

# Compatibility
As of nodeJS, that tool aims to be available on all majors OS.
It has actually been tested under linux / macos / windows xp-vista
Mac OS setup has to be re tested and verified, some difficulties appeared because of sudo requirement to install binaries globally.

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

phantomizer --server <project_dir> [ --environment <environment> ]

phantomizer --test <project_dir> [ --environment <environment> ]

phantomizer --export <project_dir> [ --environment <environment> ]

phantomizer --document <project_dir>

phantomizer --clean <project_dir>

phantomizer --confess <grunt target>
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

    phantomjs

    https://github.com/senchalabs/connect

    https://github.com/jacobrask/styledocco
    https://github.com/jacobrask/docco
    https://github.com/jamesgpearce/confess
    https://github.com/jrburke/requirejs
    https://github.com/mishoo/UglifyJS
    https://github.com/crowjonah/grunt-imgmin
    https://github.com/gruntjs/grunt
    https://github.com/jquery/qunit
    https://github.com/gruntjs/grunt-contrib-qunit

    https://github.com/jquery/jquery
    knockout
    holmes
    jshint
    csslint
    csslint

# Why ?

Because html rocks, but our tools fails.

## Release History


---

