#!/usr/bin/env node

// load some modules
var fs = require("fs");
var path = require("path");
var optimist = require("optimist");
var grunt = require("grunt");
var ph_libutil = require("phantomizer-libutil");
var underscore = require("underscore");

var file_utils = ph_libutil.file_utils;

// parse command line arguments
var argv = optimist.usage('Phantomizer command line')
        // do we start a webserver ?
        .describe('server', 'Start a ready to use built-in web server')
        .string('server')
        .default('server', false)

        // needs to init your project ?
        .describe('init', 'Init a project')
        .string('init')
        .default('init', false)

        .describe('confess', 'Measure loading times of an url')
        .string('confess')
        .default('confess', false)

        .describe('test', 'Test a project')
        .string('test')
        .default('test', false)

        .describe('export', 'Export a project')
        .string('export')
        .default('export', false)

        .describe('document', 'Document a project')
        .string('document')
        .default('document', false)

        .describe('clean', 'Cleanup generated project files')
        .string('clean')
        .default('clean', false)

        .describe('target', 'Grunt task\'s target to execute')
        .string('target')
        .default('target', false)

        // needs moe info ? Use -verbose
        .describe('verbose', 'more Verbose')
        .boolean('verbose')
        .default('verbose', false)

        .describe('version', 'Display version')
        .boolean('version')
        .default('version', false)

        .check(function(argv){
            return argv.server!=false ||
                argv.init!=false ||
                argv.test!=false ||
                argv.confess!=false ||
                argv.export!=false ||
                argv.document!=false ||
                argv.clean!=false ||
                argv.version!=false ||
                false;
        })

        .argv
    ;

// let check we have some data to work on
var server = argv.server || "";
var init = argv.init || "";
var test = argv.test || "";
var export_ = argv.export || "";
var document_ = argv.document || "";
var confess = argv.confess || "";
var clean = argv.clean || "";
var target = argv.target || false;
var verbose = argv.verbose || false;
var version = argv.version || false;

console.log("Welcome to phantomizer..");

if( version ){
    console.log("phantomizer 0.1");
    process.exit(0);
}


// Did you want to start webserver
if( server != "" ){

    var project = get_project(argv, "server");

    var lib = path.join(path.dirname(fs.realpathSync(__filename)), '../lib');
    var webserver_factory = ph_libutil.webserver;

    var config = get_config(project+'/config.json');

    var router_factory = ph_libutil.router;
    var optimizer_factory = ph_libutil.optimizer;
    var meta_factory = ph_libutil.meta;

    var meta_manager = new meta_factory(process.cwd(), config.meta_dir)
    var optimizer = new optimizer_factory(meta_manager, config)
    var router = new router_factory(config.routing)

    var webserver =null;
    router.load(function(){
        webserver = new webserver_factory(router,optimizer,meta_manager,process.cwd(), config);
        webserver.start(config.web_port,config.web_ssl_port);
    })

// quit on enter touch pressed
    readline_toquit(function(){
        if( webserver != null ){
            webserver.stop();
        }
        process.exit(code=1)
    });
}

if( confess != "" ){

    var project = get_project(argv, "confess");
    var config = get_config(project+'/config.json');
    var target = get_target(argv, config.default_target);

    grunt.tasks(['phantomizer-confess:'+target], {}, function(){
        console.log("Measure done !");
    });
}

if( test != "" ){

    var project = get_project(argv, "test");
    var config = get_config(project+'/config.json');
    var target = get_target(argv, config.default_target);

    grunt.tasks(['phantomizer-qunit-runner:'+target], {}, function(){
        console.log("Test done !");
    });
}

if( export_ != "" ){

    var project = get_project(argv, "export");
    var config = get_config(project+'/config.json');
    var target = get_target(argv, config.default_target);

    var t = [
        'phantomizer-build2:'+target,
        'phantomizer-export-build:'+target,
        // 'phantomizer-export-slim:'+target,
        'export-done'
    ];
    grunt.tasks(t, {});
}

if( document_ != "" ){

    var project = get_project(argv, "document");

    get_config(project+'/config.json');
    var t = [
        'phantomizer-docco',
        'phantomizer-styledocco'
    ];
    grunt.tasks(t, {}, function(){
        console.log("Documentation done !");
    });

}

if( clean != "" ){

    var project = get_project(argv, "clean");

    var config = get_config(project+'/config.json');

    var clean_dir = function(p){
        file_utils.deleteFolderRecursive(p);
        fs.mkdirSync(p);
        if( verbose ){
            console.log("Cleaned \n\t"+p);
        }
    };

    clean_dir(config.documentation_dir);
    clean_dir(config.export_dir);
    clean_dir(config.out_dir);
    clean_dir(config.meta_dir);

    console.log("Clean done !");
}

if( init != "" ){

    var project = get_project(argv, "init");

    var make_dir = function(p){
        if( fs.existsSync(p) == false ){
            fs.mkdirSync(p);
            if( verbose ){
                console.log("Created "+p);
            }
        }
    };

    make_dir(project);
    make_dir(project+"/export");
    make_dir(project+"/run");
    make_dir(project+"/run/build");
    make_dir(project+"/run/meta");
    make_dir(project+"/documentation");
    make_dir(project+"/project");
    make_dir(project+"/project/www-core");
    make_dir(project+"/project/www-wbm");
    make_dir(project+"/project/www-vendors");

    var dist = path.join(path.dirname(fs.realpathSync(__filename)), '../dist');
    file_utils.copyFile(dist+'/Gruntfile.js', 'Gruntfile.js');
    var project_config_file = project+'/config.json';
    if( fs.existsSync(project_config_file) == false ){
        file_utils.copyFile(dist+'/config.json', project_config_file);
        var c = file_utils.readJSON(project_config_file);
        c.project_dir = project+"/project/";
        c.src_dir = project+"/project/www-core/";
        c.wbm_dir = project+"/project/www-wbm/";
        c.vendors_dir = project+"/project/www-vendors/";
        c.out_dir = project+"/run/build/";
        c.meta_dir = project+"/run/meta/";
        c.export_dir = project+"/export/";
        c.documentation_dir = project+"/documentation/";
        file_utils.writeJSON(project_config_file, c);
    }
    if( fs.existsSync(project+"/project/www-core/index.html") == false ){
        fs.writeFileSync(project+"/project/www-core/index.html", "Index file")
    }

    console.log("Init done !");
}

function get_project(argv, cmd){
    if( argv[cmd] === true || argv[cmd] == "" ){
        console.log("Please input the project name such,");
        console.log("phantomizer --"+cmd+" <project>");
        process.exit(code=0)
    }
    return argv[cmd];
}

function get_target(argv, default_target){
    if( argv["target"] === true || argv["target"] == "" ){
        if( default_target ){
            return default_target;
        }else{
            console.log("Please input the project name such,");
            console.log("phantomizer --<switch> <project> --target <target>");
            process.exit(code=0)

        }
    }
    return argv["target"];
}

function get_config( file ){
    var working_dir = process.cwd();
    var config = grunt.file.readJSON( file );

    if( ! config.vendors_dir ){
        config.vendors_dir = require("phantomizer-websupport").www_vendors_path;
    }
    if( ! config.dirlisting_dir ){
        config.dirlisting_dir = require("phantomizer-html-dirlisting").html_dirlisting.resouces_path;
    }

    config.wd                   = working_dir;
    config.project_dir          = path.resolve(config.project_dir)+"/";

    config.out_dir              = path.resolve(config.out_dir)+"/";
    config.meta_dir             = path.resolve(config.meta_dir)+"/";
    config.export_dir           = path.resolve(config.export_dir)+"/";
    config.documentation_dir    = path.resolve(config.documentation_dir)+"/";

    config.src_dir              = path.resolve(config.src_dir)+"/";
    config.wbm_dir              = path.resolve(config.wbm_dir)+"/";
    config.vendors_dir          = path.resolve(config.vendors_dir)+"/";
    config.dirlisting_dir       = path.resolve(config.dirlisting_dir)+"/";

    config.web_paths            = config.web_paths || [
        config.src_dir,
        config.wbm_dir,
        config.vendors_dir,
        config.dirlisting_dir
    ];

    config.web_paths_no_dir     = [
        config.src_dir,
        config.wbm_dir,
        config.vendors_dir
    ];
    for( var n in config.web_paths ) config.web_paths[n] = path.resolve(config.web_paths[n])+"/";
    config.build_run_paths      = [];
    for( var n in config.web_paths ) config.build_run_paths.push(config.web_paths[n]);
    config.build_run_paths.push(config.out_dir);

    config.verbose              = !!config.verbose;
    config.debug                = !!config.debug;
    config.log                  = !!config.log;
    config.default_target       = config.default_target?config.default_target:"dev";
    config.web_domain           = config.web_domain?config.web_domain:"localhost";
    config.web_port             = config.web_port?config.web_port:8080;
    config.web_ssl_port         = config.web_ssl_port?config.web_ssl_port:8081;
    config.test_web_port        = config.test_web_port?config.test_web_port:8090;
    config.test_web_ssl_port    = config.test_web_ssl_port?config.test_web_ssl_port:8091;
    config.phantom_web_port     = config.phantom_web_port?config.phantom_web_port:8090;
    config.phantom_web_ssl_port = config.phantom_web_ssl_port?config.phantom_web_ssl_port:8091;

// pass important path to docco task
    init_task_options(config,"phantomizer-docco",{
        'src_dir':config.src_dir,
        'wbm_dir':config.wbm_dir,
        'documentation_dir':config.documentation_dir,
        src_pattern:[config.src_dir+"/js/",config.wbm_dir+"/js/"],
        out_dir:config.documentation_dir+'/js/',
        layout:'linear'
    });

// pass important path to styledocco task
    init_task_options(config,"phantomizer-styledocco",{
        'src_dir':config.src_dir,
        'wbm_dir':config.wbm_dir,
        'documentation_dir':config.documentation_dir,
        "basePath":config.project_dir,
        "src_pattern":[config.src_dir+"**/*.css",config.wbm_dir+"**/*.css"],
        "out_dir":config.documentation_dir+"/css/"
    });

// pass important path to confess task
    init_task_options(config,"phantomizer-confess",{
        meta_dir:config.meta_dir,
        web_server_paths:[config.src_dir,config.wbm_dir,config.vendors_dir],
        port:config.test_web_port,
        ssl_port:config.test_web_ssl_port,
        host:'http://'+config.web_domain
    });

// pass important path to requirejs task
    init_task_options(config,"phantomizer-requirejs",{
        src_paths: [config.src_dir,config.wbm_dir,config.vendors_dir,config.out_dir],
        project_dir: config.project_dir,
        meta_dir: config.meta_dir,
        "baseUrl": config.src_dir+"js",
        "optimize": "none",
        "wrap": true,
        "name": "almond",
        "paths": {
            "almond": config.vendors_dir+"/js/almond-0.2.5",
            "vendors": config.vendors_dir+"/js/vendors"
        },
        "almond_path": config.vendors_dir+"/js/almond-0.2.5",
        "vendors_path": config.vendors_dir+"/js/vendors"
    });
    init_target_options(config,"phantomizer-requirejs","stryke-assets-min-build",{
        "optimize": "uglify"
    });

// pass important path to requirecss task
    init_task_options(config,"phantomizer-requirecss",{
        src_paths: config.build_run_paths,
        project_dir: config.project_dir,
        meta_dir: config.meta_dir,
        "optimizeCss": "standard.keepComments.keepLines"
    });
    init_target_options(config,"phantomizer-requirecss","stryke-assets-min-build",{
        "optimizeCss": "standard"
    });

// pass important path to manifest task
    init_task_options(config,"phantomizer-manifest",{
        meta_dir:config.meta_dir,
        project_dir: config.project_dir,
        manifest_reloader:config.vendors_dir+'/js/manifest.reloader.js',
        src_paths:config.build_run_paths,
        network:["*"]
    });
    init_task_options(config,"phantomizer-manifest-html",{
        meta_dir:config.meta_dir,
        project_dir: config.project_dir,
        manifest_reloader:config.vendors_dir+'/js/manifest.reloader.js',
        src_paths:config.build_run_paths,
        network:["*"]
    });

// pass important path to html-assets task
    init_task_options(config,"phantomizer-html-assets",{
        meta_dir:config.meta_dir,
        out_path:config.out_dir,
        requirejs_src:config.scripts.requirejs.src || null,
        requirejs_baseUrl:config.scripts.requirejs.baseUrl || null,
        "manifest": false,
        paths:config.build_run_paths
    });
    init_target_options(config,"phantomizer-html-assets","stryke-build",{
        "file_suffix":"-b",
        "requirejs_src":null
    });
    init_target_options(config,"phantomizer-html-assets","stryke-assets-build",{
        "file_suffix":"-ba",
        "requirejs": true,
        "image_merge": true
    });
    init_target_options(config,"phantomizer-html-assets","stryke-assets-min-build",{
        "file_suffix":"-mba",
        "requirejs": true,
        "imgcompressor": true,
        "image_merge": true,
        "uglify_js": true
    });

// pass important path to htmlcompressor task
    init_task_options(config,"phantomizer-htmlcompressor",{
        meta_dir:config.meta_dir,
        "preserved_html_comments": "(?si)<!-- #preserve_(js|css) .+? #endpreserve -->"
    });
    init_target_options(config,"phantomizer-htmlcompressor","stryke-assets-min-build",{
        "compress-js":true,
        "compress-css":true
    });

    init_task_options(config,"phantomizer-dir-htmlcompressor",{
        meta_dir:config.meta_dir,
        "preserved_html_comments": "(?si)<!-- #preserve_(js|css) .+? #endpreserve -->"
    });
    init_target_options(config,"phantomizer-dir-htmlcompressor","stryke-assets-min-build",{
        "compress-js":true,
        "compress-css":true
    });

// pass important path to uglify task
    init_task_options(config,"phantomizer-uglifyjs",{
        meta_dir:config.meta_dir
    });

// pass important path to phantomizer-websupport task
    init_task_options(config,"phantomizer-dir-inject-html-extras",{
        "requirejs":config.scripts.requirejs || null
    });

// pass important path to phantomizer-strykejs
    init_task_options(config,"phantomizer-strykejs-builder",{
        port:config.phantom_web_port,
        ssl_port:config.phantom_web_ssl_port,
        paths:config.build_run_paths,
        meta_dir:config.meta_dir,
        scripts:config.scripts,
        css:config.css
    });
    init_task_options(config,"phantomizer-strykejs-builder2",{
        meta_dir:config.meta_dir,
        port:config.phantom_web_port,
        ssl_port:config.phantom_web_ssl_port,
        urls_file:'',
        paths:config.build_run_paths,
        scripts:config.scripts,
        css:config.css
    });

// pass important path to phantomizer-html-builder
    init_task_options(config,"phantomizer-html-builder",{
        out_path:config.out_dir,
        meta_dir:config.meta_dir,
        paths:config.web_paths_no_dir,
        htmlcompressor:false,
        build_assets:false
    });
    init_target_options(config,"phantomizer-html-builder","stryke-assets-build",{
        "build_assets": true
    });
    init_target_options(config,"phantomizer-html-builder","stryke-assets-min-build",{
        "build_assets": true,
        "htmlcompressor": true
    });

    init_task_options(config,"phantomizer-html-jitbuild",{
        out_path:config.out_dir,
        meta_dir:config.meta_dir,
        paths:[config.src_dir,config.wbm_dir,config.vendors_dir],
        htmlcompressor:false,
        build_assets:false
    });
    init_target_options(config,"phantomizer-html-jitbuild","stryke-assets-build",{
        "build_assets": true
    });
    init_target_options(config,"phantomizer-html-jitbuild","stryke-assets-min-build",{
        "build_assets": true,
        "htmlcompressor": true
    });

    init_task_options(config,"phantomizer-html-builder2",{
        out_path:config.out_dir,
        meta_dir:config.meta_dir,
        paths:config.web_paths_no_dir,
        html_manifest:false,
        inject_extras:false,
        htmlcompressor:false,
        build_assets:false
    });
    init_target_options(config,"phantomizer-html-builder2","stryke-assets-build",{
        "build_assets": true
    });
    init_target_options(config,"phantomizer-html-builder2","stryke-assets-min-build",{
        "build_assets": true,
        "html_manifest": true,
        "htmlcompressor": true
    });

// pass important path to phantomizer-imgopt
    init_task_options(config,"phantomizer-imgopt",{
        optimizationLevel: 0,
        "progressive":false,
        out_path:config.out_dir,
        meta_dir:config.meta_dir,
        paths:config.build_run_paths
    });
    init_target_options(config,"phantomizer-imgopt","stryke-assets-min-build",{
        "optimizationLevel": 1,
        "progressive":true
    });

// pass important path to phantomizer-qunit-runner
    init_task_options(config,"phantomizer-qunit-runner",{
        "port":config.test_web_port,
        "ssl_port":config.test_web_ssl_port,
        "paths":config.web_paths,
        "inject_assets":true,
        "base_url":"http://"+config.web_domain+":"+config.test_web_port+"/",
        "test_scripts_base_url":"/js/tests/",
        "requirejs_src": config.scripts.requirejs.src,
        "requirejs_baseUrl": config.scripts.requirejs.baseUrl
    });
    init_target_options(config,"phantomizer-qunit-runner","dev",{});
    init_target_options(config,"phantomizer-qunit-runner","staging",{
        "paths":[
            "<%= export_dir %>/staging/"
        ],
        "inject_assets":false
    });
    init_target_options(config,"phantomizer-qunit-runner","contribution",{
        "paths":[
            "<%= export_dir %>/contribution/"
        ],
        "inject_assets":false
    });
    init_target_options(config,"phantomizer-qunit-runner","production",{
        "paths":[
            "<%= export_dir %>/production/"
        ],
        "inject_assets":false
    });

// pass important path to phantomizer-gm
    init_task_options(config,"phantomizer-gm-merge",{
        out_dir:config.out_dir,
        meta_dir:config.meta_dir,
        "paths": config.build_run_paths
    });

// pass important path to phantomizer-export-build
    init_task_options(config,"phantomizer-export-build",{
        "export_dir":config.export_dir,
        "paths":config.build_run_paths,
        "copy_patterns":[
            "**/*.appcache",
            "**/*.html",
            "**/*.htm",
            "**/*.js",
            "**/*.css",
            "**/*.gif",
            "**/*.jpg",
            "**/*.jpeg",
            "**/*.png",
            "**/*.pdf",
            "**/*.xml",
            "**/*.json",
            "**/*.jsonp",
            "**/*.map"
        ]
    });
    init_target_options(config,"phantomizer-export-build","dev",{
        "export_dir":config.export_dir+"/dev/www/"
    });
    init_target_options(config,"phantomizer-export-build","staging",{
        "export_dir":config.export_dir+"/staging/www/",
        "rm_files":[
            config.export_dir+"/staging/www/README.md"
        ]
    });
    init_target_options(config,"phantomizer-export-build","contribution",{
        "export_dir":config.export_dir+"/contribution/www/",
        "rm_files":[
            config.export_dir+"/contribution/www/README.md"
        ]
    });
    init_target_options(config,"phantomizer-export-build","production",{
        "export_dir":config.export_dir+"/production/www/",
        "rm_files":[
            config.export_dir+"/production/www/README.md"
        ],
        "rm_dir":[
            config.export_dir+"/production/www/js/tests/"
        ]
    });

    init_task_options(config,"phantomizer-build",{
        clean_dir:[
            config.out_dir,
            config.meta_dir,
            config.export_dir,
            config.documentation_dir
        ],
        build_target:"stryke-assets-min-build"
    });

    init_task_options(config,"phantomizer-build2",{
        clean_dir:[
            config.out_dir,
            config.meta_dir,
            config.export_dir,
            config.documentation_dir
        ],
        build_target:"stryke-assets-min-build",
        urls_file:"run/urls.json",
        inject_extras:false
    });
    init_target_options(config,"phantomizer-build2","dev",{
        "export_dir":config.export_dir+"/dev/",
        inject_extras:true
    });
    init_target_options(config,"phantomizer-build2","staging",{
        "export_dir":config.export_dir+"/staging/"
    });
    init_target_options(config,"phantomizer-build2","contribution",{
        "export_dir":config.export_dir+"/contribution/"
    });
    init_target_options(config,"phantomizer-build2","production",{
        "export_dir":config.export_dir+"/production/"
    });

// pass important path to phantomizer-export-build
    init_task_options(config,"phantomizer-export-slim",{
        "export_dir":config.export_dir,
        "paths":config.build_run_paths,
        "copy_patterns":[
        ]
    });
    init_target_options(config,"phantomizer-export-slim","dev",{
        "export_dir":config.export_dir+"/dev/"
    });
    init_target_options(config,"phantomizer-export-slim","staging",{
        "export_dir":config.export_dir+"/staging/"
    });
    init_target_options(config,"phantomizer-export-slim","contribution",{
        "export_dir":config.export_dir+"/contribution/"
    });
    init_target_options(config,"phantomizer-export-slim","production",{
        "export_dir":config.export_dir+"/production/"
    });


    grunt.config.init(config);
    return grunt.config.get();
}


function init_task_options(config,task_name,options){
    if(!config[task_name]) config[task_name] = {options:{}};
    if(!config[task_name].options) config[task_name].options = {};
    underscore.defaults(config[task_name].options, options);
}
function init_target_options(config,task_name,target_name,options){
    if(!config[task_name][target_name]) config[task_name][target_name] = {options:{}};
    if(!config[task_name][target_name].options) config[task_name][target_name].options = {};
    underscore.defaults(config[task_name][target_name].options,options);
}

function readline_toquit( end_handler ){

    var readline = require('readline')
    var rl = readline.createInterface(process.stdin, process.stdout);

    rl.question('Press enter to leave...\n', function(answer) {
        console.log('See you soon !');
        if( end_handler != null ){
            end_handler()
        }
    });

}



