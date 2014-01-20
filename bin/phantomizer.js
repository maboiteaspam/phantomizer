#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var optimist = require("optimist");
var grunt = require("grunt");
var ph_libutil = require("phantomizer-libutil");
var underscore = require("underscore");

var file_utils = ph_libutil.file_utils;

// parse command line arguments
var argv = optimist.usage('Phantomizer command line')

        // --init [project_folder]
        .describe('init', 'Initialize the project file systems environment')
        .string('init')
        .default('init', "")

        // --server [project_folder]
        .describe('server', 'Starts the built-in web server')
        .string('server')
        .default('server', "")

        // --test [project_folder]
        .describe('test', 'Test a project')
        .string('test')
        .default('test', "")

        // --document [project_folder]
        .describe('document', 'Document projects javascripts and css files')
        .string('document')
        .default('document', "")

        // --export [project_folder]
        .describe('export', 'Export a project')
        .string('export')
        .default('export', "")

        // --clean [project_folder]
        .describe('clean', 'Cleanup tmp files')
        .string('clean')
        .default('clean', "")

        // --[init|server|test|document|export|clean] [project_folder] --environment [env_name]
        .describe('environment', 'Environment to run')
        .string('environment')
        .default('environment', "")

        // --list_tasks [project_folder]
        .describe('list_tasks', 'List available tasks for configuration')
        .string('list_tasks')
        .default('list_tasks', "")

        // --describe_task [project_folder] --task [task_name]
        .describe('describe_task', 'Display a task configuration')
        .string('describe_task')
        .default('describe_task', "")

        // --describe_task [project_folder] --task [task_name]
        .describe('task', 'The task to manipulate')
        .string('task')
        .default('task', "")

        //
        .describe('list_tasks', 'List available tasks')
        .string('list_tasks')
        .default('list_tasks', false)

        // --list_envs [project_folder]
        .describe('list_envs', 'List available environments')
        .string('list_envs')
        .default('list_envs', false)

        // --describe_env [project_folder] --environment [env_name]
        .describe('describe_env', 'Display an environment configuration')
        .string('describe_env')
        .default('describe_env', "")

        // --[init|server|test|document|export|clean] [project_folder] --verbose
        .describe('verbose', 'more verbose')
        .boolean('verbose')
        .default('verbose', false)

        // --[init|server|test|document|export|clean] [project_folder] --debug
        .describe('debug', 'debug : even more verbose')
        .boolean('debug')
        .default('debug', false)

        // --version
        .describe('version', 'Display version from package.json file')
        .boolean('version')
        .default('version', false)

        .describe('help', 'Display help')
        .boolean('help')
        .default('help', false)

        // --server  [project_folder] --default_webdomain [dns_to_listen]
        .describe('default_webdomain', 'Override default web domain listened by server')
        .string('default_webdomain')
        .default('default_webdomain', "")

        // @dot not use
        .describe('confess', 'Measure loading times of an url')
        .string('confess')
        .default('confess', "")

        .check(function(argv){
            if( argv.describe_task!="" && argv.task=="" )
                return false;
            return true;
        })

        .check(function(argv){
            // requires one of those switch
            return argv.init ||
                argv.server ||
                argv.test ||
                argv.document ||
                argv.export ||
                argv.clean||
                argv.version ||
                argv.help ||
                argv.list_tasks ||
                argv.describe_task ||
                argv.describe_env ||
                argv.list_envs ||
                argv.confess ||
                false;
        })

        .argv
    ;


var known_configs = {};

// fine tune some data
var verbose = argv.verbose || false;
var version = argv.version || false;
var help = argv.help || false;
var debug = argv.debug || false;

// set grunt js log verbosity
grunt.option('verbose', verbose);
grunt.option('debug', debug);

// Welcome user
grunt.log.subhead("Welcome to phantomizer !")

// display version number
if( version ){
    var pkg = fs.readFileSync(__dirname+"/../package.json", 'utf-8');
    pkg = JSON.parse(pkg);
    grunt.log.ok("phantomizer " + pkg.version)
    process.exit(0);
}

// display help
if( help ){
    optimist.showHelp()
    process.exit(0);
}


// Starts local webserver for development purpose
if( argv.server != "" ){

    var project = get_project(argv, "server");
    var environment = get_environment(argv);

    // configuration initialization, including grunt config, required call prior ro grunt usage
    var config = get_config(project+'/config.json', environment, argv.default_webdomain);

    var router_factory = ph_libutil.router;
    var optimizer_factory = ph_libutil.optimizer;
    var meta_factory = ph_libutil.meta;
    var webserver_factory = ph_libutil.webserver;

    var meta_manager = new meta_factory(process.cwd(), config.meta_dir);
    var optimizer = new optimizer_factory(meta_manager, config);
    var router = new router_factory(config.routing);

    var webserver = null;
    // load routes, eventually from a remote webserver
    router.load(function(){
        // create a new local webserver with found route urls
        webserver = new webserver_factory(router,optimizer,meta_manager,process.cwd(), config);
        // try to listen both clear text and ssl
        var h = "http://"+config.web_domain+(config.web_port?":"+config.web_port:"");
        var hs = "https://"+config.web_domain+(config.web_domain?":"+config.web_ssl_port:"");
        grunt.log.ok("Webserver started on "+h+" "+(hs?hs:""))
        // starts local webserver
        webserver.start(config.web_port,config.web_ssl_port,config.web_domain);
    })

// quit on enter touch pressed
    readline_toquit(function(){
        if( webserver != null ){
            webserver.stop();
        }
        process.exit(code=1)
    });
}

// run the project test suites
if( argv.test != "" ){

    var project     = get_project(argv, "test");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    init_config(project+'/config.json', environment);

    grunt.tasks(['phantomizer-qunit-runner:'+environment], {}, function(){
        grunt.log.ok("Test done !");
    });
}

// build and export the project
if( argv.export != "" ){

    var project     = get_project(argv, "export");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    init_config(project+'/config.json', environment);

    var tasks = [
        'phantomizer-build2:'+environment,
        'phantomizer-export-build:'+environment,
        // 'phantomizer-export-slim:'+environment,
        'export-done'
    ];
    grunt.tasks(tasks, {}, function(){
        grunt.log.ok("Export done !");
    });
}

// document the project javacscrit and css files
if( argv.document != "" ){

    project = get_project(argv, "document");
    // configuration initialization, including grunt config, required call prior ro grunt usage
    init_config(project+'/config.json', environment);

    var tasks = [
        'phantomizer-docco',
        'phantomizer-styledocco'
    ];
    grunt.tasks(tasks, {}, function(){
        grunt.log.ok("Documentation done !");
    });

}

// clean the temporary files and folders
if( argv.clean != "" ){

    var project     = get_project(argv, "clean");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    var config      = get_config(project+'/config.json',environment, argv.default_webdomain);

    var clean_dir = function(p){
        file_utils.deleteFolderRecursive(p);
        fs.mkdirSync(p);
        if( verbose ){
            grunt.log.ok("Cleaned \n\t"+p);
        }
    };

    clean_dir(config.documentation_dir);
    clean_dir(config.export_dir);
    clean_dir(config.out_dir);
    clean_dir(config.meta_dir);

    grunt.log.ok("Clean done !");
}

// list available tasks for configuration
if( argv.list_tasks != "" ){

    var project     = get_project(argv, "list_tasks");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    var config      = get_config(project+'/config.json', environment, argv.default_webdomain);

    grunt.log.ok("reading configuration file "+project+'/config.json');
    for( var n in config ){
        if( n.match(/^phantomizer-/) )
            grunt.log.writeln(n);
    }
}

// Describe options for the given task name
if( argv.describe_task != "" ){

    var project     = get_project(argv, "describe_task");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    var config      = get_config(project+'/config.json', environment, argv.default_webdomain);
    var task_name = argv.task || "";

    if( config[task_name] ){
        grunt.log.ok( task_name+"=" );
        grunt.log.writeln( JSON.stringify(config[task_name],null,4) );
    }else{
        grunt.log.warn("No such task '"+task_name+"' found for the project '"+project+"'");
    }
}

// list available environments for configuration
if( argv.list_envs != "" ){

    var project     = get_project(argv, "list_envs");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    var config      = get_config(project+'/config.json', environment, argv.default_webdomain);

    grunt.log.ok("reading configuration file "+project+'/config.json');
    for( var n in config.environment ){
        grunt.log.writeln(n);
    }
}

// Describe options for the given environment name
if( argv.describe_env != "" ){

    var project     = get_project(argv, "describe_env");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    var config      = get_config(project+'/config.json', environment, argv.default_webdomain);

    if( config.environment[environment] ){
        grunt.log.ok( environment+"=" );
        grunt.log.writeln( JSON.stringify(config.environment[environment],null,4) );
    }else{
        grunt.log.warn("No such environment '"+environment+"' found for the project '"+project+"'");
    }
}

// Initialize directory structure for the given project name
if( argv.init != "" ){

    var project = get_project(argv, "init");

    var make_dir = function(p){
        if( fs.existsSync(p) == false ){
            fs.mkdirSync(p);
            if( verbose ){
                grunt.log.ok("Created "+p);
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
    if( fs.existsSync('Gruntfile.js') == false ){
        file_utils.copyFile(dist+'/Gruntfile.js', 'Gruntfile.js');
    }
    var project_config_file = project+'/config.json';
    if( fs.existsSync(project_config_file) == false ){
        file_utils.copyFile(dist+'/config.json', project_config_file);
        var c = file_utils.readJSON(project_config_file);
        c.project_dir = project+"/project/";
        c.src_dir = project+"/project/www-core/";
        c.wbm_dir = project+"/project/www-wbm/";
        // c.vendors_dir = project+"/project/www-vendors/"; // disabled to let JIT assignation in get_config
        c.out_dir = project+"/run/build/";
        c.meta_dir = project+"/run/meta/";
        c.export_dir = project+"/export/";
        c.documentation_dir = project+"/documentation/";
        file_utils.writeJSON(project_config_file, c, true);
    }
    var pckg_config_file = 'package.json';
    if( fs.existsSync(pckg_config_file) == false ){
        file_utils.copyFile(dist+'/package.json', pckg_config_file);
        var c = file_utils.readJSON(pckg_config_file);
        file_utils.writeJSON(pckg_config_file, c, true);
    }
    if( fs.existsSync(project+"/project/www-core/index.html") == false ){
        file_utils.copyFile(dist+'/www-core/index.html', project+"/project/www-core/index.html");
    }
    if( fs.existsSync(project+"/project/www-core/js/index.js") == false ){
        fs.mkdirSync(project+"/project/www-core/js/");
        file_utils.copyFile(dist+'/www-core/js/index.js', project+"/project/www-core/js/index.js");
    }

    grunt.log.ok("Init done !");
}

// hmm, this needs improvements to let us select a target, or better an url from command line
if( argv.confess != "" ){

    var project     = get_project(argv, "confess");
    var environment = get_environment(argv);
    // configuration initialization, including grunt config, required call prior ro grunt usage
    init_config(project+'/config.json', environment);

    grunt.tasks(['phantomizer-confess:'+environment], {}, function(){
        grunt.log.ok("Measure done !");
    });
}


/**
 * Helps to get the right value from optimist object
 * @param argv
 * @param cmd
 * @returns {*}
 */
function get_project(argv, cmd){
    if( argv[cmd] === true || argv[cmd] == "" ){
        grunt.fail.fatal("Please input the project name such : phantomizer --"+cmd+" [project]\n");
        process.exit(code=0)
    }
    return argv[cmd];
}
/**
 * Helps to get the right value from optimist object
 * @param argv
 * @returns {*}
 */
function get_environment(argv){
    if( argv["environment"] === true || argv["environment"] == "" ){
        grunt.verbose.writeln("");
        grunt.verbose.writeln("Automatically selected environment dev");
        grunt.verbose.writeln("you can input the environment using,");
        grunt.verbose.writeln("phantomizer --[switch] [project] --environment [environment]");
        grunt.verbose.writeln("");
        return "dev";
    }
    return argv["environment"];
}


/**
 * Get the configuration object
 * after parsing thru grunt config system
 * Should receive the project configuration file
 * @param file
 * @param enviroment
 * @returns {*}
 */
function get_config( file,enviroment,default_webdomain ){

    var k = file+""+enviroment;
    if( !known_configs[k] ){
        known_configs[k] = init_config(file,enviroment,default_webdomain);
    }
    return known_configs[k];
}
/**
 * Given a json file,
 * parse it,
 * apply default values,
 * apply environment values,
 * apply grunt js config system,
 * render it
 *
 * @param file
 * @param enviroment
 * @returns {*}
 */
function init_config(file,enviroment,default_webdomain){
    var working_dir = process.cwd();

// check for existsing configuration file in the supposed project directory
    if( grunt.file.exists(file) == false ){
        grunt.fail.fatal("Project configuration file does not exists at "+file);
    }

    var config = grunt.file.readJSON( file );
// init general structure
    config = underscore.defaults(config,{
        vendors_dir:require("phantomizer-websupport").www_vendors_path,
        dirlisting_dir:require("phantomizer-html-dirlisting").html_dirlisting.resouces_path,
        wd:working_dir,
// user directory
        project_dir:"",
        run_dir:"",
        out_dir:"",
        meta_dir:"",
        export_dir:"",
        documentation_dir:"",
        src_dir:"",
        wbm_dir:"",
        web_paths:null,
        web_paths_no_dir:null,
        build_run_paths:null,
// logging
        verbose: !!verbose,
        debug: !!debug,
        log: !!verbose,
        default_webdomain: default_webdomain || "localhost",
        environment:{}
    });

// pre define some environment out of the box
    config.environment = underscore.defaults(config.environment,{
        production:{},
        contribution:{},
        staging:{},
        dev:{}
    });

    config.environment.production = underscore.defaults(config.environment.production,{
        datasource_base_url:"http://localhost/",
        web_domain:"<%= default_webdomain %>",
        web_port:8050,
        web_ssl_port:8051,
        test_web_port:8052,
        test_web_ssl_port:8053,
        phantom_web_port:8054,
        phantom_web_ssl_port:8055
    });

    config.environment.contribution = underscore.defaults(config.environment.contribution,{
        datasource_base_url:"http://localhost/",
        web_domain:"<%= default_webdomain %>",
        web_port:8060,
        web_ssl_port:8061,
        test_web_port:8062,
        test_web_ssl_port:8063,
        phantom_web_port:8064,
        phantom_web_ssl_port:8065
    });

    config.environment.staging = underscore.defaults(config.environment.staging,{
        datasource_base_url:"http://localhost/",
        web_domain:"<%= default_webdomain %>",
        web_port:8070,
        web_ssl_port:8071,
        test_web_port:8072,
        test_web_ssl_port:8073,
        phantom_web_port:8074,
        phantom_web_ssl_port:8075
    });

    config.environment.dev = underscore.defaults(config.environment.dev,{
        datasource_base_url:"http://localhost/",
        web_domain:"<%= default_webdomain %>",
        web_port:8080,
        web_ssl_port:8081,
        test_web_port:8092,
        test_web_ssl_port:8083,
        phantom_web_port:8084,
        phantom_web_ssl_port:8085
    });

// init configuration accordingly to the environement variable
    if( enviroment ){
        if( !config.environment[enviroment] ){
            grunt.fail.fatal("Unknown environment "+enviroment+" in the configuration file");
        }else{
            for( var n in config.environment[enviroment] ){
                config[n] = config.environment[enviroment][n];
            }
        }
    }

    for( var n in config.routing){
        if( config.routing[n].urls_datasource ){
            if( ! config.routing[n].urls_datasource.match(/^http/)){
                config.routing[n].urls_datasource = config.datasource_base_url+""+config.routing[n].urls_datasource+"";
            }
        }
    }


// init directories
    config.project_dir          = path.resolve(config.project_dir)+"/";
// the paths to build
    config.run_dir              = path.resolve(config.run_dir)+"/";
    config.meta_dir             = path.resolve(config.meta_dir)+"/";
    config.out_dir              = path.resolve(config.out_dir)+"/";
// the paths to export
    config.export_dir           = path.resolve(config.export_dir)+"/";
    config.documentation_dir    = path.resolve(config.documentation_dir)+"/";
// the path containing user app
    config.src_dir              = path.resolve(config.src_dir)+"/";
    config.wbm_dir              = path.resolve(config.wbm_dir)+"/";
    config.vendors_dir          = path.resolve(config.vendors_dir)+"/";
// the path containing assets for dirlisting
    config.dirlisting_dir       = path.resolve(config.dirlisting_dir)+"/";
// the paths to be served thru developer webserver
    config.web_paths            = config.web_paths || [
        config.src_dir,
        config.wbm_dir,
        config.vendors_dir,
        config.dirlisting_dir
    ];
// the paths to be served thru builder webserver
    config.web_paths_no_dir     = [
        config.src_dir,
        config.wbm_dir,
        config.vendors_dir
    ];
// the paths to be served to optimizer
    for( var n in config.web_paths ) config.web_paths[n] = path.resolve(config.web_paths[n])+"/";
    config.build_run_paths      = [];
    for( var n in config.web_paths ) config.build_run_paths.push(config.web_paths[n]);
    config.build_run_paths.push(config.out_dir);
// scripts manipulation
    if(!config.scripts)
        config.scripts = {}
    config.scripts = underscore.defaults(config.scripts,{
        strips:[
            /*
             "/js/vendors/go-jquery/jquery-2.0.3.min.js",
             */
        ],
        requirejs:{},
        prepend:{
            /*
             "/js/vendors/go-jquery/jquery-2.0.3.min.js": [
             "/js/vendors/go-jquery/jquery-2.0.3.min.js"
             ]
             */
        },
        append:{
            /*
             "/js/vendors/go-jquery/jquery-2.0.3.min.js": [
             "/js/vendors/go-jquery/jquery-2.0.3.min.js"
             ]
             */
        }
    })
    config.scripts.requirejs = underscore.defaults(config.scripts.requirejs,{
        "src": [
            /*
             "require-2.1.8.min.js",
             "require-2.1.9.min.js",
             */
        ],
        "baseUrl": "/js/",
        "paths":{
            /*
             "almond": config.vendors_dir+config.scripts.requirejs.baseUrl+"/almond-0.2.5",
             "vendors": config.vendors_dir+config.scripts.requirejs.baseUrl+"/vendors",
             "wbm": config.wbm_dir+config.scripts.requirejs.baseUrl+"/wbm"
             */
        }
    })
    config.scripts.requirejs.paths = underscore.defaults(config.scripts.requirejs.paths,{
        "almond": config.scripts.requirejs.baseUrl+"almond-0.2.5",
        "vendors": config.scripts.requirejs.baseUrl+"vendors/",
        "wbm": config.scripts.requirejs.baseUrl+"wbm/"
    })
// css manipulation
    if(!config.css)
        config.css = {}
    config.css = underscore.defaults(config.css,{
        strips:[
            /*
             "/js/vendors/go-jquery/jquery-2.0.3.min.css",
             */
        ],
        prepend:{
            /*
             "/js/vendors/go-jquery/jquery-2.0.3.min.css": [
             "/js/vendors/go-jquery/jquery-2.0.3.min.css"
             ]
             */
        },
        append:{
            /*
             "/js/vendors/go-jquery/jquery-2.0.3.min.css": [
             "/js/vendors/go-jquery/jquery-2.0.3.min.css"
             ]
             */
        }
    })

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
        host:config.web_domain,
        port:config.test_web_port,
        ssl_port:config.test_web_ssl_port
    });

// pass important path to requirejs task
    init_task_options(config,"phantomizer-requirejs",{
        src_paths: [config.src_dir,config.wbm_dir,config.vendors_dir,config.out_dir],
        project_dir: config.project_dir,
        meta_dir: config.meta_dir,
        "baseUrl": config.src_dir+""+config.scripts.requirejs.baseUrl,
        "optimize": "none",
        "wrap": true,
        "name": "almond",
        "paths": config.scripts.requirejs.paths,
        "almond_path": config.vendors_dir+config.scripts.requirejs.baseUrl+"/almond-0.2.5",
        "vendors_path": config.vendors_dir+config.scripts.requirejs.baseUrl+"/vendors",
        "wbm_path": config.wbm_dir+config.scripts.requirejs.baseUrl+"/wbm"
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
        requirejs_paths:config.scripts.requirejs.paths || {},
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
        run_dir:config.run_dir,
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
        "html_manifest": false,
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
            "<%= export_dir %>/staging/www/"
        ],
        "inject_assets":false
    });
    init_target_options(config,"phantomizer-qunit-runner","contribution",{
        "paths":[
            "<%= export_dir %>/contribution/www/"
        ],
        "inject_assets":false
    });
    init_target_options(config,"phantomizer-qunit-runner","production",{
        "paths":[
            "<%= export_dir %>/production/www/"
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
            "**/*.manifest",

            "**/*.txt",

            "**/*.html",
            "**/*.htm",

            "**/*.js",

            "**/*.css",

            "**/*.gif",
            "**/*.jpg",
            "**/*.jpeg",
            "**/*.png",
            "**/*.ico",

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
        clean_dir:[
            config.out_dir,
            config.meta_dir,
            config.export_dir+"/dev/",
            config.documentation_dir
        ]
    });
    init_target_options(config,"phantomizer-build2","staging",{
        clean_dir:[
            config.out_dir,
            config.meta_dir,
            config.export_dir+"/staging/",
            config.documentation_dir
        ]
    });
    init_target_options(config,"phantomizer-build2","contribution",{
        clean_dir:[
            config.out_dir,
            config.meta_dir,
            config.export_dir+"/contribution/",
            config.documentation_dir
        ]
    });
    init_target_options(config,"phantomizer-build2","production",{
        clean_dir:[
            config.out_dir,
            config.meta_dir,
            config.export_dir+"/production/",
            config.documentation_dir
        ]
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

/**
 * Init a task option in the grunt js manner
 *
 * {
 *  "task_name":{
 *      "options":{}
 *  }
 * }
 *
 * @param config
 * @param task_name
 * @param options
 */
function init_task_options(config,task_name,options){
    if(!config[task_name]) config[task_name] = {options:{}};
    if(!config[task_name].options) config[task_name].options = {};
    underscore.defaults(config[task_name].options, options);
}
/**
 * Init a task target option in the grunt js manner
 *
 * {
 *  "task_name":{
 *      "options":{},
 *      "target_name":{
 *          "options":{}
 *      }
 *  }
 * }
 *
 * @param config
 * @param task_name
 * @param target_name
 * @param options
 */
function init_target_options(config,task_name,target_name,options){
    if(!config[task_name][target_name]) config[task_name][target_name] = {options:{}};
    if(!config[task_name][target_name].options) config[task_name][target_name].options = {};
    underscore.defaults(config[task_name][target_name].options,options);
}

/**
 * Waits for user to press Enter key,
 * kills remaining webserver,
 * exit
 *
 * @param end_handler
 */
function readline_toquit( end_handler ){

    var readline = require('readline')
    var rl = readline.createInterface(process.stdin, process.stdout);

    rl.question('Press enter to leave...\n', function(answer) {
        grunt.log.subhead('See you soon !');
        if( end_handler != null ){
            end_handler()
        }
    });

}



