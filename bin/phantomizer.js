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

    if( ! config["vendors_dir"] ){
        config["vendors_dir"] = require("phantomizer-websupport").www_vendors_path;
    }
    if( ! config["dirlisting_dir"] ){
        config["dirlisting_dir"] = require("phantomizer-html-dirlisting").html_dirlisting.resouces_path;
    }

    config.wd = working_dir;
    config.project_dir = path.resolve(config.project_dir)+"/";
    config.src_dir = path.resolve(config.src_dir)+"/";
    config.wbm_dir = path.resolve(config.wbm_dir)+"/";
    config.vendors_dir = path.resolve(config.vendors_dir)+"/";
    config.dirlisting_dir = path.resolve(config.dirlisting_dir)+"/";
    config.out_dir = path.resolve(config.out_dir)+"/";
    config.meta_dir = path.resolve(config.meta_dir)+"/";
    config.export_dir = path.resolve(config.export_dir)+"/";
    config.documentation_dir = path.resolve(config.documentation_dir)+"/";

// pass important path to docco task
    init_task_options(config,"phantomizer-docco",{
        'src_dir':config.src_dir,
        'wbm_dir':config.wbm_dir,
        'documentation_dir':config.documentation_dir,
        src_pattern:["<%= src_dir %>/js/","<%= wbm_dir %>/js/"],
        out_dir:'<%= documentation_dir %>/js/',
        layout:'linear'
    });

// pass important path to styledocco task
    init_task_options(config,"phantomizer-styledocco",{
        'src_dir':config.src_dir,
        'wbm_dir':config.wbm_dir,
        'documentation_dir':config.documentation_dir,
        "basePath":"<%= project_dir %>",
        "src_pattern":["<%= src_dir %>**/*.css","<%= wbm_dir %>**/*.css"],
        "out_dir":"<%= documentation_dir %>/css/"
    });

// pass important path to confess task
    init_task_options(config,"phantomizer-confess",{
        meta_dir:config.meta_dir,
        web_server_paths:[config.src_dir,config.wbm_dir,config.vendors_dir],
        port:config.web_port,
        ssl_port:config.web_ssl_port,
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
        "almond_path": config.vendors_dir+"/js/almond-0.2.5",
        "vendors_path": config.vendors_dir+"/js/vendors"
    });
    init_target_options(config,"phantomizer-requirejs","stryke-assets-min-build",{
        "optimize": "uglify"
    });

// pass important path to requirecss task
    init_task_options(config,"phantomizer-requirecss",{
        src_paths: [config.src_dir,config.wbm_dir,config.vendors_dir,config.out_dir],
        project_dir: config.project_dir,
        meta_dir: config.meta_dir,
        "optimizeCss": "standard.keepComments.keepLines"
    });
    init_target_options(config,"phantomizer-requirecss","stryke-assets-min-build",{
        "optimizeCss": "standard"
    });

// pass important path to requirecss task
    init_task_options(config,"phantomizer-manifest",{
        meta_dir:config.meta_dir,
        project_dir: config.project_dir,
        manifest_reloader:config.vendors_dir+'/js/manifest.reloader.js',
        src_paths:[config.src_dir,config.wbm_dir,config.vendors_dir,config.out_dir],
        network:["*"]
    });
    init_task_options(config,"phantomizer-manifest-html",{
        meta_dir:config.meta_dir,
        project_dir: config.project_dir,
        manifest_reloader:config.vendors_dir+'/js/manifest.reloader.js',
        src_paths:[config.src_dir,config.wbm_dir,config.vendors_dir,config.out_dir],
        network:["*"]
    });

    grunt.config.init(config);
    return grunt.config.get();
}


function init_task_options(config,task_name,options){
    if(!config[task_name]) config[task_name] = {options:{}};
    if(!config[task_name].options) config[task_name].options = {};
    underscore.extend(config[task_name].options,options);
}
function init_target_options(config,task_name,target_name,options){
    if(!config[task_name][target_name]) config[task_name][target_name] = {options:{}};
    if(!config[task_name][target_name].options) config[task_name][target_name].options = {};
    underscore.extend(config[task_name][target_name].options,options);
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



