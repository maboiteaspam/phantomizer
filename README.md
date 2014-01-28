# phantomizer v0.1.x

> Provides the command line to use a phantomizer project

phantomizer embeds popular tools all together
to provide an unified and easy to use html development environment.

It includes an embedded web browser to support live reloaded development, network perturbation generator, device previewer for mobile, a dashboard to let you do all of that.

It provides several ready to go automated process about build, test, export.

It includes several ready to use / configure GruntJS task oriented toward web development needs,
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

This tool simply tries to provide a simple way to build the newer kind of HTML UI we expect nowadays.
It relies on various well-known libraries to-do-the-job and pilot them thru the configuration file and the application you ll provide it.

# Website

http://maboiteaspam.github.io/phantomizer/

# Generated documentation

http://maboiteaspam.github.io/phantomizer/documentation/phantomizer.html

# General assumption
This project assume you want to make web application, and so provides tools to do it.
It aims to provide support to create both websites (multi pages / SEO) and webapp (one page).
It assumes that your websites has relatively small list of urls to build in case of a website.
As an example, at that time it builds 500 urls in ~2 mins under ubuntu 13 with an intel core i7.
This project assume that you want to build and create a one package application, it does not intend to work as a proxy for FEO.

# Client side mandatory
It is mandatory to use phantomizer client side library to successfully build.
At least, it has never been tested and developed without that library included on client side.
That library helps you to take advantage of the different build stage available, you are strongly invited to use it in your development based on that tool.

# Compatibility
As of nodeJS, that tool aims to be available on all majors OS.
It has actually been actively used under linux / macos / windows xp-vista
Mac OS setup has to be re tested and verified, some difficulties appeared because of sudo requirement to install binaries globally.


# Installation
```bash
npm install maboiteaspam/phantomizer
```

You will be able to run this
```bash
nodes_modules/.bin/phantomizer --version
```

# Glocal CLI access
```bash
npm install maboiteaspam/phantomizer -g
```

You will be able to run this
```bash
phantomizer --version
```

# Usage
```bash

phantomizer --version
phantomizer --help

phantomizer --init <project_dir>

phantomizer --server <project_dir> [ --environment <environment> ]
phantomizer --test <project_dir> [ --environment <environment> ]
phantomizer --export <project_dir> [ --environment <environment> ]
phantomizer --document <project_dir>
phantomizer --clean <project_dir>

phantomizer --list_tasks <project_dir> [ --environment <environment> ]
phantomizer --describe_task <project_dir> --task <task_name> [ --environment <environment> ]

phantomizer --list_envs <project_dir> [ --environment <environment> ]
phantomizer --describe_env <project_dir> --task <task_name> [ --environment <environment> ]
```

# Start
```bash
phantomizer --init my_project

phantomizer --server my_project
```

The new directory my_project is now available.

Using the file my_project/config.json, you can add new routes and adjust settings to your preferences.

Add the new application files in the directory my_project/www-core/.

my_project/run is the storage folder used by phantomizer to build your project.

my_project/documentation contains the documented version of your scripts and css.

my_project/export contains the exported project files, ready to deploy.


# The libraries you will find in there
    phantomjs
    https://github.com/senchalabs/connect
    https://github.com/jacobrask/styledocco
    https://github.com/jacobrask/docco
    https://github.com/jrburke/requirejs
    https://github.com/mishoo/UglifyJS
    https://github.com/crowjonah/grunt-imgmin
    https://github.com/gruntjs/grunt
    https://github.com/jquery/qunit
    https://github.com/gruntjs/grunt-contrib-qunit
    https://github.com/jamesgpearce/confess
    holmes
    jshint
    csslint
    csslint

Client side
    https://github.com/jquery/jquery
    knockout

## Release History


---

