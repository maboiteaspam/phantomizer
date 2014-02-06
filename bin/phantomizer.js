#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var optimist = require("optimist");
var grunt = require("grunt");
var ph_libutil = require("phantomizer-libutil");
var underscore = require("underscore");
var http = require("http");

var file_utils = ph_libutil.file_utils;

// parse command line arguments
// ----------
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

    // --test [project_folder] --format [junit]
    .describe('format', 'Formatter output')
    .string('format')
    .default('format', "")

    // --document [project_folder]
    .describe('document', 'Document projects javascripts and css files')
    .string('document')
    .default('document', "")

    // --export [project_folder]
    .describe('export', 'Export a project')
    .string('export')
    .default('export', "")

    // --code_review [project_folder] --target [default|junit|checkstyle]
    .describe('code_review', 'Review the source code')
    .string('code_review')
    .default('code_review', "")

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

    // --target [target_name]
    .describe('target', 'The target to manipulate')
    .string('target')
    .default('target', "")

    // --list_tasks [project_folder]
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

    // --[init|server|test|document|export|clean] [project_folder] --force
    .describe('force', 'Force')
    .boolean('force')
    .default('force', false)

    // --version
    .describe('version', 'Display version from package.json file')
    .boolean('version')
    .default('version', false)

    // --help
    .describe('help', 'Display help')
    .boolean('help')
    .default('help', false)

    // --server  [project_folder] --default_webdomain [dns_to_listen]
    .describe('default_webdomain', 'Override default web domain listened by server')
    .string('default_webdomain')
    .default('default_webdomain', "")

    // --confess [project_folder] --url [url,]
    .describe('confess', 'Measure loading times of an url')
    .string('confess')
    .default('confess', "")

    // --url [url]
    .describe('url', 'The target url to load')
    .string('url')
    .default('url', "")

    // --browse_export [project_folder] --environment [environment]
    .describe('browse_export', 'Starts an express webserver to browse the exported project')
    .string('browse_export')
    .default('browse_export', "")

    .check(function(argv){
      // if describe_env is provided, then environment is required
      if( argv.describe_env!="" && argv.environment=="" )
        return false;
      // if describe_task is provided, then task is required
      if( argv.describe_task!="" && argv.task=="" )
        return false;
      // if confess, then url is required
      if( argv.confess!="" && argv.url=="" )
        return false;
      return true;
    })

    .check(function(argv){
      // requires one of those switch
      return argv.init ||
        argv.server ||
        argv.browse_export ||
        argv.test ||
        argv.document ||
        argv.export ||
        argv.code_review ||
        argv.clean||
        argv.version ||
        argv.help ||
        argv.list_tasks ||
        argv.describe_task ||
        argv.list_envs ||
        argv.describe_env ||
        argv.confess ||
        false;
    })

    .argv
  ;


// declare variables and
// fine tune some data
var verbose = argv.verbose || false;
var debug = argv.debug || false;

var known_configs = {};

// set grunt js log verbosity
grunt.option('verbose', verbose);
grunt.option('debug', debug);
grunt.option('force', argv.force || false);

// Welcome user
grunt.log.subhead("Welcome to phantomizer !")

// display version number
// ----------
if( argv.version || false ){
  var pkg = fs.readFileSync(__dirname+"/../package.json", 'utf-8');
  pkg = JSON.parse(pkg);
  grunt.log.ok("phantomizer " + pkg.version)
  process.exit(0);
}

// display help
// ----------
if( argv.help || false ){
  optimist.showHelp()
  process.exit(0);
}


// Starts local webserver
// ----------
// For development purpose
if( argv.server != "" ){

  var project = get_project(argv, "server");
  var environment = get_environment(argv);

  // configuration initialization, including grunt config, required call prior to grunt usage
  var config = get_config(project, environment, argv.default_webdomain);

  // initialize some helpers
  var router_factory = ph_libutil.router;
  var optimizer_factory = ph_libutil.optimizer;
  var meta_factory = ph_libutil.meta;
  var webserver_factory = ph_libutil.webserver;

  // hols meta of all built files
  var meta_manager = new meta_factory(process.cwd(), config.meta_dir);
  // knows how to proceed optimization
  var optimizer = new optimizer_factory(meta_manager, config, grunt);
  // provides a catalog of route url
  var router = new router_factory(config.routing);
  // a specifically designed webserver for JIT optimization
  var webserver = null;

  // load routes, eventually from a remote webserver
  router.load(function(){
    // create a new local webserver with found route urls
    webserver = new webserver_factory(router,optimizer,meta_manager,grunt, config.web_paths);
    // try to listen both clear text and ssl
    var h = "http://"+config.web_domain+(config.web_port?":"+config.web_port:"");
    var hs = "https://"+config.web_domain+(config.web_domain?":"+config.web_ssl_port:"");
    grunt.log.ok("Webserver started on "+h+" "+(hs?hs:""))
    // starts local webserver
    webserver.start(config.web_port,config.web_ssl_port,config.web_domain);

    // quit on enter touch pressed
    readline_toquit(function(){
      // stops remaining web server
      if( webserver != null ) webserver.stop();
      // exit program
      process.exit(code=1)
    });
  });
}

// Run project tests
// ----------
if( argv.test != "" ){

  // the project to test
  var project     = get_project(argv, "test");
  // the specific environment to setup
  var environment = get_environment(argv);
  // configuration initialization, including grunt config, required call prior to grunt usage
  init_config(project, environment);

  var target = environment;
  if( argv.format != "" ){
    target = argv.format;
    if( environment != "" ){
      target = argv.format+"-"+environment;
    }
  }

  grunt.tasks(['phantomizer-qunit-runner:'+target], {}, function(){
    grunt.log.ok("Test done !");
  });
}

// Build then export the project
// ----------
if( argv.export != "" ){

  // the project to export
  var project     = get_project(argv, "export");
  // the specific environment to setup
  var environment = get_environment(argv);

  // configuration initialization, including grunt config, required call prior to grunt usage
  init_config(project, environment);

  var tasks = [
    // invoke the task to build the whole project
    'phantomizer-project-builder:'+environment,
  ];
  // invoke grunt
  grunt.tasks(tasks, {}, function(){
    grunt.log.ok("Export done !");
  });
}

// Document the project
// ----------
// Document all javascript and css files
if( argv.document != "" ){

  // the project to document
  project = get_project(argv, "document");
  // configuration initialization, including grunt config, required call prior to grunt usage
  init_config(project, environment);

  var tasks = [
    // invoke the task to document javascript files
    'phantomizer-docco',
    // invoke the task to document css files
    'phantomizer-styledocco'
  ];
  // invoke grunt
  grunt.tasks(tasks, {}, function(){
    grunt.log.ok("Documentation done !");
  });
}

// Reviews code of your project
// ----------
// Analyze script files with jshint
// Analyze css files with csslint
if( argv.code_review != "" ){

  // the project to clean
  var project = get_project(argv, "code_review");
  // configuration initialization, including grunt config, required call prior to grunt usage
  var config = get_config(project, null, argv.default_webdomain);

  var target = (argv.format!=""?argv.format:"default");

  var tasks = [
    // invoke the task to analyze javascript files
    'jshint:'+target,
    'csslint:'+target
  ];

  // invoke grunt
  grunt.tasks(tasks, {}, function(){
    grunt.log.ok("Code Review done !");
  });
}

// Clean the project
// ----------
// delete the temporary,
// build, export, documentation files and folders
if( argv.clean != "" ){

  // the project to clean
  var project     = get_project(argv, "clean");
  // configuration initialization, including grunt config, required call prior to grunt usage
  var config      = get_config(project, null, argv.default_webdomain);

  var delete_dir = function(p){
    grunt.verbose.writeln(p)
    grunt.file.delete(p, {force: true})
  }
  delete_dir(config.documentation_dir)
  delete_dir(config.export_dir)
  delete_dir(config.run_dir)

  grunt.log.ok("Clean done !");
}

// List tasks
// ----------
// Provide useful information about
// the configuration used during any operation
if( argv.list_tasks != "" ){

  // the project to list tasks of
  var project     = get_project(argv, "list_tasks");
  // the specific environment to setup
  var environment = get_environment(argv);
  // configuration initialization, including grunt config, required call prior to grunt usage
  var config      = get_config(project, environment, argv.default_webdomain);

  grunt.log.ok("reading configuration file "+project+'/config.json');
  // iterate config properties
  for( var n in config ){
    // print its name if it starts by phantomizer-
    if( n.match(/^phantomizer-/) ) grunt.log.writeln(n);
  }
}

// Describe task
// ----------
// Details a specific task options
if( argv.describe_task != "" ){

  // the project to describe task of
  var project     = get_project(argv, "describe_task");
  // the specific environment to setup
  var environment = get_environment(argv);
  // configuration initialization, including grunt config, required call prior to grunt usage
  var config      = get_config(project, environment, argv.default_webdomain);
  var task_name = argv.task || "";

  // if the task exists
  if( config[task_name] ){
    // pretty prints it
    grunt.log.ok( task_name+"=" );
    grunt.log.writeln( JSON.stringify(config[task_name],null,4) );
  }else{
    grunt.log.warn("No such task '"+task_name+"' found for the project '"+project+"'");
  }
}

// List available environment
// ----------
// Environments let adjust some behavior
if( argv.list_envs != "" ){

  // the project to describe environments of
  var project     = get_project(argv, "list_envs");
  // configuration initialization, including grunt config, required call prior to grunt usage
  var config      = get_config(project, null, argv.default_webdomain);

  grunt.log.ok("reading configuration file "+project+'/config.json');
  for( var n in config.environment ){
    // prints its name
    grunt.log.writeln(n);
  }
}

// Describe environment
// ----------
// Details specififc environment options
if( argv.describe_env != "" ){

  // the project to describe environment of
  var project     = get_project(argv, "describe_env");
  // the specific environment to setup
  var environment = get_environment(argv);
  // configuration initialization, including grunt config, required call prior to grunt usage
  var config      = get_config(project, environment, argv.default_webdomain);

  // if the environment exists
  if( config.environment[environment] ){
    // pretty prints it
    grunt.log.ok( environment+"=" );
    grunt.log.writeln( JSON.stringify(config.environment[environment],null,4) );
  }else{
    grunt.log.warn("No such environment '"+environment+"' found for the project '"+project+"'");
  }
}

// Initialize a project
// ----------
// Initialize directory structure
// Initialize default files
// package.json Gruntfile.js, config.json, index.htm, index.js
if( argv.init != "" ){

  // the project to initialize
  var project = get_project(argv, "init");

  var make_dir = function(p){
    grunt.file.mkdir(p)
    grunt.log.ok("\t"+p);
  };

  grunt.log.ok("Setting up directory structure");
  grunt.log.ok(process.cwd());

  make_dir(project);
  make_dir(project+"/export");
  make_dir(project+"/run");
  make_dir(project+"/run/build");
  make_dir(project+"/run/meta");
  make_dir(project+"/documentation");
  make_dir(project+"/project");
  make_dir(project+"/project/www-core");
  make_dir(project+"/project/www-wbm");
  //make_dir(project+"/project/www-vendors");

  // locate dist files to install
  var dist = path.join(path.dirname(fs.realpathSync(__filename)), '../dist');

  // if user Grunt file does not exists
  if( grunt.file.exists('Gruntfile.js') == false ){
    // set it up
    grunt.file.copy(dist+'/Gruntfile.js', 'Gruntfile.js');
  }

  // if user Project config file does not exists
  var project_config_file = project+'/config.json';
  if( grunt.file.exists(project_config_file) == false ){
    // loads dist version
    file_utils.copyFile(dist+'/config.json', project_config_file);
    var c = file_utils.readJSON(project_config_file);
    // adjust the configuration to that specific project
    c.project_dir = project+"/project/";
    c.src_dir = project+"/project/www-core/";
    c.wbm_dir = project+"/project/www-wbm/";
    /* c.vendors_dir = project+"/project/www-vendors/"; // disabled to let JIT assignation in get_config */
    c.out_dir = project+"/run/build/";
    c.meta_dir = project+"/run/meta/";
    c.export_dir = project+"/export/";
    c.documentation_dir = project+"/documentation/";
    // saves it
    file_utils.writeJSON(project_config_file, c, true);
  }
  // if user Package config file does not exists
  var pckg_config_file = 'package.json';
  if( fs.existsSync(pckg_config_file) == false ){
    // set it up
    grunt.file.copy(dist+'/package.json', pckg_config_file);
  }
  // setup playground files
  if( grunt.file.exists(project+"/project/www-core/playground.html") == false ){
    grunt.file.copy(dist+'/www-core/playground.html', project+"/project/www-core/playground.html");
  }
  if( grunt.file.exists(project+"/project/www-core/favicon.ico") == false ){
    grunt.file.copy(dist+'/www-core/favicon.ico', project+"/project/www-core/favicon.ico");
  }
  if( grunt.file.exists(project+"/project/www-core/js/playground.js") == false ){
    grunt.file.mkdir(project+"/project/www-core/js/");
    grunt.file.copy(dist+'/www-core/js/playground.js', project+"/project/www-core/js/playground.js");
  }
  grunt.file.mkdir(project+"/project/www-core/css/");

  // adjust .gitignore file
  var gitignore = grunt.file.read(".gitignore");
  var gitignoreRegExp = new RegExp("^"+project+"([/].*)?$","img");
  if( ! gitignore.match(gitignoreRegExp) ){
    gitignore += "\n\n";
    gitignore += project+"/run\n";
    gitignore += project+"/export\n";
    gitignore += project+"/documentation\n";
    gitignore += project+"/code_review\n";
    gitignore += project+"/qunit\n";
  }
  grunt.file.write(".gitignore",gitignore);

  grunt.log.ok("Init done !");
}

// hmm, this needs improvements to let us select a target, or better an url from command line
if( argv.confess != "" ){

  var project     = get_project(argv, "confess");
  var environment = get_environment(argv);
  // configuration initialization, including grunt config, required call prior ro grunt usage
  var config = get_config(project, environment);

  if( config["phantomizer-confess"]
    && config["phantomizer-confess"][environment] ){
    var opts = config["phantomizer-confess"];
    opts[environment].options.in_request = argv.url;
    grunt.config("phantomizer-confess",opts);
  }

  grunt.tasks(['phantomizer-confess:'+environment], {}, function(){
    grunt.log.ok("Measure done !");
  });
}

// Starts an express web server to browse the exported project
// ----------
// it is useful for many purposes to e bale to browse the built version, such,
// manual debug
// automated testing
// performance analysis
if( argv.browse_export != "" ){

  var project     = get_project(argv, "browse_export");
  var environment = get_environment(argv);
  // configuration initialization, including grunt config, required call prior ro grunt usage
  config = get_config(project, environment);

  var directory = config.export_dir+"/"+environment;
  if( grunt.file.exists(directory) ){
    if( grunt.file.exists(directory+"/www/") ){
      directory += "/www/";
      grunt.log.error("patched Webroot to "+directory);
    }
  }else{
    grunt.fail.fatal(directory+" does not exists, you should build the project first\nphantomizer --export "+project);
  }

  // initialize some helpers
  var router_factory = ph_libutil.router;
  var optimizer_factory = ph_libutil.optimizer;
  var meta_factory = ph_libutil.meta;
  var webserver_factory = ph_libutil.webserver;

  // hols meta of all built files
  var meta_manager = new meta_factory(process.cwd(), config.meta_dir);
  // knows how to proceed optimization
  var optimizer = new optimizer_factory(meta_manager, config, grunt);
  // provides a catalog of route url
  var router = new router_factory(config.routing);
  // a specifically designed webserver for JIT optimization
  var webserver = null;

  // load routes, eventually from a remote webserver
  router.load(function(){
    // create a new local webserver with found route urls
    webserver = new webserver_factory(router,optimizer,meta_manager,grunt, [directory]);
    webserver.enable_build(false);
    webserver.enable_assets_inject(false);
    // try to listen both clear text and ssl
    var h = "http://"+config.web_domain+(config.web_port?":"+config.web_port:"");
    var hs = "https://"+config.web_domain+(config.web_domain?":"+config.web_ssl_port:"");
    grunt.log.ok("Webserver started on "+h+" "+(hs?hs:""));
    grunt.log.writeln("Webroot is "+directory);
    // starts local webserver
    webserver.start(config.web_port,config.web_ssl_port,config.web_domain);

    // quit on enter touch pressed
    readline_toquit(function(){
      // stops remaining web server
      if( webserver != null ) webserver.stop();
      // exit program
      process.exit(code=1)
    });
  });
}


// Helper functions
// -------------
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


// Phantomizer Configuration getter
// -------------
/**
 * Get the configuration object
 * after parsing thru grunt config system
 * Should receive the project configuration file
 * @param file
 * @param environment|null
 * @returns {*}
 */
function get_config( project,environment,default_webdomain ){

  var k = project+""+environment;
  if( !known_configs[k] ){
    known_configs[k] = init_config(project,environment,default_webdomain);
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
 * @param environment
 * @returns {*}
 */
function init_config(project,environment,default_webdomain){
  var working_dir = process.cwd();

// check for existsing configuration file in the supposed project directory
  var file = project+'/config.json';
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
    project_dir:project+"/",
    run_dir:project+"/run",
    out_dir:project+"/run/build/",
    meta_dir:project+"/run/meta/",
    export_dir:project+"/export/",
    documentation_dir:project+"/documentation/",
    src_dir:project+"/www-core/",
    wbm_dir:project+"/www-wbm/",
    web_paths:null,
    web_paths_no_dir:null,
    build_run_paths:null,
// logging
    verbose: !!verbose,
    debug: !!debug,
    log: !!verbose,

    //stryke-build | stryke-assets-build | stryke-assets-min-build
    build_target:"stryke-assets-min-build",
    inject_extras:false,
    htmlcompressor:true,
    build_assets:true,
    html_manifest:false,
    sitemap:true,

// datasource urls
    datasource_base_url:"http://localhost/",
    datasource_credentials:{
      // a file containing credentials such user:pwd
      auth_file:"",
      // env variable name containing the user
      user_env_var:"",
      // env variable name containing the password
      pwd_env_var:"",
      // user in the configuration
      user:"",
      // pwd in the configuration
      pwd:""
    },
// client side dns
    default_webdomain: default_webdomain || "localhost",
// environment specifics
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
    datasource_base_url: config.datasource_base_url,
    datasource_credentials: config.datasource_credentials,
    web_domain:"<%= default_webdomain %>",
    web_port:8050,
    web_ssl_port:8051,
    test_web_port:8052,
    test_web_ssl_port:8053,
    phantom_web_port:8054,
    phantom_web_ssl_port:8055,
    build_target:config.build_target,
    inject_extras:config.inject_extras,
    htmlcompressor:config.htmlcompressor,
    build_assets:config.build_assets,
    html_manifest:config.html_manifest,
    sitemap:config.sitemap
  });

  config.environment.contribution = underscore.defaults(config.environment.contribution,{
    datasource_base_url: config.datasource_base_url,
    datasource_credentials: config.datasource_credentials,
    web_domain:"<%= default_webdomain %>",
    web_port:8060,
    web_ssl_port:8061,
    test_web_port:8062,
    test_web_ssl_port:8063,
    phantom_web_port:8064,
    phantom_web_ssl_port:8065,
    build_target:config.build_target,
    inject_extras:config.inject_extras,
    htmlcompressor:config.htmlcompressor,
    build_assets:config.build_assets,
    html_manifest:config.html_manifest,
    sitemap:config.sitemap
  });

  config.environment.staging = underscore.defaults(config.environment.staging,{
    datasource_base_url: config.datasource_base_url,
    datasource_credentials: config.datasource_credentials,
    web_domain:"<%= default_webdomain %>",
    web_port:8070,
    web_ssl_port:8071,
    test_web_port:8072,
    test_web_ssl_port:8073,
    phantom_web_port:8074,
    phantom_web_ssl_port:8075,
    build_target:config.build_target,
    inject_extras:config.inject_extras,
    htmlcompressor:config.htmlcompressor,
    build_assets:config.build_assets,
    html_manifest:config.html_manifest,
    sitemap:config.sitemap
  });

  config.environment.dev = underscore.defaults(config.environment.dev,{
    datasource_base_url: config.datasource_base_url,
    datasource_credentials: config.datasource_credentials,
    web_domain:"<%= default_webdomain %>",
    web_port:8080,
    web_ssl_port:8081,
    test_web_port:8082,
    test_web_ssl_port:8083,
    phantom_web_port:8084,
    phantom_web_ssl_port:8085,
    build_target:config.build_target,
    inject_extras:config.inject_extras,
    htmlcompressor:config.htmlcompressor,
    build_assets:config.build_assets,
    html_manifest:config.html_manifest,
    sitemap:config.sitemap
  });

  // Overwrite general configuration with selected environment
  if( environment ){
    if( !config.environment[environment] ){
      grunt.fail.fatal("Unknown environment "+environment+" in the configuration file");
    }else{
      for( var n in config.environment[environment] ){
        config[n] = config.environment[environment][n];
      }
    }
  }

  // finalize routes[].urls_datasource url with config.datasource_base_url
  //
  // apply for credentials
  for( var n in config.routing){
    if( config.routing[n].urls_datasource ){
      if( ! config.routing[n].urls_datasource.match(/^http/)){
        config.routing[n].urls_datasource = config.datasource_base_url+""+config.routing[n].urls_datasource+"";
      }
      if( !config.routing[n].datasource_credentials ){
        config.routing[n].datasource_credentials = config.datasource_credentials;
      }
    }
  }


// init directories
  config.project_dir          = path.resolve(config.project_dir)+"/";
// the paths to run the build
  config.run_dir              = path.resolve(config.run_dir)+"/";
  config.meta_dir             = path.resolve(config.meta_dir)+"/";
  config.out_dir              = path.resolve(config.out_dir)+"/";
// the paths to export build files to
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
  for( var n in config.web_paths ) config.web_paths[n] = path.resolve(config.web_paths[n])+"/";
// the paths to be served thru builder webserver
  config.web_paths_no_dir     = [
    config.src_dir,
    config.wbm_dir,
    config.vendors_dir
  ];
// the paths to be served to optimizer
  config.build_run_paths      = [];
  for( var n in config.web_paths ) config.build_run_paths.push(config.web_paths[n]);
  config.build_run_paths.push(config.out_dir);
// scripts manipulation
  if(!config.scripts){
    config.scripts = underscore.defaults(config.scripts || {},{
      // references scripts to delete from the built files
      // they are absolute url
      strips:[
        /*
         "/js/vendors/go-jquery/jquery-2.0.3.min.js",
         */
      ],
      // an object of requirejs options
      requirejs:{},
      // references scripts to prepend before your script node
      prepend:{
        // each reference can be a composition of scripts
        // they are absolute url
        /*
         "/js/vendors/go-jquery/jquery-2.0.3.min.js": [
         "/js/vendors/go-jquery/jquery-2.0.3.min.js"
         ]
         */
      },
      // references scripts to append to the bottom of the document
      append:{
        // each reference can be a composition of scripts
        // they are absolute url
        /*
         "/js/vendors/go-jquery/jquery-2.0.3.min.js": [
         "/js/vendors/go-jquery/jquery-2.0.3.min.js"
         ]
         */
      }
    })
  }
  // requirejs default options
  config.scripts.requirejs = underscore.defaults(config.scripts.requirejs,{
    // list absolute urls to requirejs version that could be encountered
    "src": [
      /*
       "require-2.1.10.min.js",
       "require-2.1.9.min.js",
       "require-2.1.8.min.js",
       */
    ],
    // the project base url for requirejs optimization, loading ect
    "baseUrl": "/js/",
    // the project paths for requirejs optimization, loading ect
    "paths":{
      /*
       "almond": config.vendors_dir+config.scripts.requirejs.baseUrl+"/almond-0.2.5",
       "vendors": config.vendors_dir+config.scripts.requirejs.baseUrl+"/vendors",
       "wbm": config.wbm_dir+config.scripts.requirejs.baseUrl+"/wbm"
       */
    }
  });
  // predefine some requirejs paths
  config.scripts.requirejs.paths = underscore.defaults(config.scripts.requirejs.paths,{
    // reference almond for better built files
    "almond": config.scripts.requirejs.baseUrl+"almond-0.2.5",
    // the phantomizer-websupport preselected libraries
    "vendors": config.scripts.requirejs.baseUrl+"vendors/",
    // the wbm additional project folder
    "wbm": config.scripts.requirejs.baseUrl+"wbm/"
  })
// css manipulation
  if(!config.css){
    config.css = underscore.defaults(config.css || {},{
      // references css to delete from the built files
      // they are absolute url
      strips:[
        /*
         "/css/my.css",
         */
      ],
      // references css to prepend before your css node
      prepend:{
        // each reference can be a composition of scripts
        // they are absolute url
        /*
         "/js/vendors/go-jquery/jquery-2.0.3.min.css": [
         "/js/vendors/go-jquery/jquery-2.0.3.min.css"
         ]
         */
      },
      // references css to append to the bottom of the document
      append:{
        // each reference can be a composition of scripts
        // they are absolute url
        /*
         "/js/vendors/go-jquery/jquery-2.0.3.min.css": [
         "/js/vendors/go-jquery/jquery-2.0.3.min.css"
         ]
         */
      }
    })
  }

// initialize phantomizer-docco
// ----------
  init_task_options(config,"phantomizer-docco",{
    src_pattern:[config.src_dir+"/js/",config.wbm_dir+"/js/"],
    out_dir:config.documentation_dir+'/js/',
    layout:'linear'
  });

// initialize phantomizer-styledocco
// ----------
  init_task_options(config,"phantomizer-styledocco",{
    "basePath":config.project_dir,
    "src_pattern":[config.src_dir+"**/*.css",config.wbm_dir+"**/*.css"],
    "out_dir":config.documentation_dir+"/css/"
  });

// initialize grunt-contrib-jshint
// ----------
  var jshint_src = {
    src:[
      config.src_dir+"**/*.js",
      config.wbm_dir+"**/*.js",

      '!'+config.src_dir+'**/*.min.js',
      '!'+config.src_dir+'**/*.min-js',
      '!'+config.src_dir+'**/vendors/**',

      '!'+config.wbm_dir+'**/*.min.js',
      '!'+config.wbm_dir+'**/*.min-js',
      '!'+config.wbm_dir+'**/vendors/**'
    ]
  };
  init_task_options(config,"jshint",{
    force: true,
    '-W097': true,
    curly: true,
    eqeqeq: true,
    eqnull: true,
    browser: true,
    globals: {
      jQuery: true,
      $: true,
      _: true,
      ko: true,
      require: true,
      define: true,
      asyncTest: true,
      start: true,
      EJS: true
    }
    // remove reporter option to get default one
    // html output ?
    //, reporter:"checkstyle"
    // absolute error path with row/column on one line.
    //, reporter: './node_modules/jshint-path-reporter'
    // junit, requires an reporterOutput option
    //, reporter: './node_modules/jshint-junit-reporter'
    // ,reporterOutput: 'some/file.xml'
  });
  init_target_options(config,"jshint","default",{
    reporter: './node_modules/jshint-path-reporter'
  },jshint_src);
  init_target_options(config,"jshint","checkstyle",{
    reporter: 'checkstyle',
    reporterOutput: config.project_dir+'/../code_review/jshint_checkstyle.xml'
  },jshint_src);
  init_target_options(config,"jshint","junit",{
    reporter: './node_modules/jshint-junit-reporter/reporter.js',
    reporterOutput: config.project_dir+'/../code_review/jshint_junit.xml'
  },jshint_src);

// initialize grunt-contrib-jshint
// ----------
  var csslint_src = {
    src:[
      config.src_dir+"**/*.css",
      config.wbm_dir+"**/*.css",

      '!'+config.src_dir+'**/*.min.css',
      '!'+config.src_dir+'**/*.min-css',
      '!'+config.src_dir+'**/vendors/**',

      '!'+config.wbm_dir+'**/*.min.css',
      '!'+config.wbm_dir+'**/*.min-css',
      '!'+config.wbm_dir+'**/vendors/**'
    ]
  };
  init_task_options(config,"csslint",{
  });
  init_target_options(config,"csslint","default",{
  },csslint_src);
  init_target_options(config,"csslint","checkstyle",{
    formatters: [
      {id: 'checkstyle-xml', dest: config.project_dir+'/../code_review/csslint_checkstyle.xml'}
    ]
  },csslint_src);
  init_target_options(config,"csslint","junit",{
    formatters: [
      {id: 'junit-xml', dest: config.project_dir+'/../code_review/csslint_junit.xml'}
    ]
  },csslint_src);

// initialize phantomizer-confess
// ----------
  init_task_options(config,"phantomizer-confess",{
    meta_dir:config.meta_dir,
    web_server_paths:[config.src_dir,config.wbm_dir,config.vendors_dir],
    host:config.web_domain,
    port:config.test_web_port,
    ssl_port:config.test_web_ssl_port
  });
  init_target_options(config,"phantomizer-confess","dev",{
    "web_server_paths":[
      "<%= export_dir %>/dev/www/"
    ]
  });
  init_target_options(config,"phantomizer-confess","staging",{
    "paths":[
      "<%= export_dir %>/staging/www/"
    ]
  });
  init_target_options(config,"phantomizer-confess","contribution",{
    "paths":[
      "<%= export_dir %>/contribution/www/"
    ]
  });
  init_target_options(config,"phantomizer-confess","production",{
    "paths":[
      "<%= export_dir %>/production/www/"
    ]
  });

// initialize phantomizer-requirejs
// ----------
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

// initialize phantomizer-requirecss
// ----------
  init_task_options(config,"phantomizer-requirecss",{
    src_paths: config.build_run_paths,
    project_dir: config.project_dir,
    meta_dir: config.meta_dir,
    "optimizeCss": "standard.keepComments.keepLines"
  });
  init_target_options(config,"phantomizer-requirecss","stryke-assets-min-build",{
    "optimizeCss": "standard"
  });

// initialize phantomizer-manifest
// ----------
  init_task_options(config,"phantomizer-manifest-html",{
    meta_dir:config.meta_dir,
    project_dir: config.project_dir,
    manifest_reloader:config.vendors_dir+'/js/manifest.reloader.js',
    src_paths:config.build_run_paths,
    network:["*"]
  });
  init_task_options(config,"phantomizer-project-manifest",{
    target_path: config.export_dir,
    network:["*"]
  });

// initialize phantomizer-html-assets
// ----------
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

// initialize phantomizer-htmlcompressor
// ----------
  init_task_options(config,"phantomizer-htmlcompressor",{
    meta_dir:config.meta_dir,
    "preserved_html_comments": "(?si)<!-- #preserve_(js|css) .+? #endpreserve -->"
  });
  init_target_options(config,"phantomizer-htmlcompressor","stryke-assets-min-build",{
    "compress-js":true,
    "compress-css":true
  });

  init_task_options(config,"phantomizer-dir-htmlcompressor",{
    in_dir:config.export_dir,
    "preserved_html_comments": "(?si)<!-- #preserve_(js|css) .+? #endpreserve -->"
  });
  init_target_options(config,"phantomizer-dir-htmlcompressor","stryke-assets-min-build",{
    "compress-js":true,
    "compress-css":true
  });

// initialize phantomizer-uglifyjs
// ----------
  init_task_options(config,"phantomizer-uglifyjs",{
    meta_dir:config.meta_dir
  });

// initialize phantomizer-dir-inject-html-extras
// ----------
  init_task_options(config,"phantomizer-dir-inject-html-extras",{
    "requirejs":config.scripts.requirejs || null
  });

// initialize phantomizer-strykejs
// ----------
  init_task_options(config,"phantomizer-strykejs-builder",{
    port:config.phantom_web_port,
    ssl_port:config.phantom_web_ssl_port,
    paths:config.build_run_paths,
    meta_dir:config.meta_dir,
    scripts:config.scripts,
    css:config.css
  });
  init_task_options(config,"phantomizer-strykejs-project-builder",{
    run_dir:config.run_dir,
    meta_dir:config.meta_dir,
    port:config.phantom_web_port,
    ssl_port:config.phantom_web_ssl_port,
    paths:config.build_run_paths,
    scripts:config.scripts,
    css:config.css
  });

// initialize phantomizer-html-builder
// ----------
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

// initialize phantomizer-html-jitbuild
// ----------
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

// initialize phantomizer-html-builder2
// ----------
  init_task_options(config,"phantomizer-html-project-builder",{
    out_path:config.out_dir,
    meta_dir:config.meta_dir,
    run_dir:config.run_dir,
    paths:config.web_paths_no_dir,
    inject_extras:false,
    build_assets:false
  });
  init_target_options(config,"phantomizer-html-project-builder","stryke-assets-build",{
    "build_assets": true
  });
  init_target_options(config,"phantomizer-html-project-builder","stryke-assets-min-build",{
    "build_assets": true
  });

// initialize phantomizer-imgopt
// ----------
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

// initialize phantomizer-qunit-runner
// ----------
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
  init_target_options(config,"phantomizer-qunit-runner","junit",{
    junitDir:config.project_dir+"/../qunit"
  });
  init_target_options(config,"phantomizer-qunit-runner","junit-dev",{
    junitDir:config.project_dir+"/../qunit/dev"
  });
  init_target_options(config,"phantomizer-qunit-runner","junit-staging",{
    junitDir:config.project_dir+"/../qunit/staging",
    "paths":[
      "<%= export_dir %>/staging/www/"
    ],
    "inject_assets":false
  });
  init_target_options(config,"phantomizer-qunit-runner","junit-contribution",{
    junitDir:config.project_dir+"/../qunit/contribution",
    "paths":[
      "<%= export_dir %>/contribution/www/"
    ],
    "inject_assets":false
  });
  init_target_options(config,"phantomizer-qunit-runner","junit-production",{
    junitDir:config.project_dir+"/../qunit/production",
    "paths":[
      "<%= export_dir %>/production/www/"
    ],
    "inject_assets":false
  });

// initialize phantomizer-gm-merge
// ----------
  init_task_options(config,"phantomizer-gm-merge",{
    out_dir:config.out_dir,
    meta_dir:config.meta_dir,
    "paths": config.build_run_paths
  });

// initialize phantomizer-export-build
// ----------
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

// initialize phantomizer-build
// ----------
  init_task_options(config,"phantomizer-build",{
    clean_dir:[
      config.out_dir,
      config.meta_dir,
      config.export_dir,
      config.documentation_dir
    ],
    build_target:"stryke-assets-min-build"
  });

// initialize phantomizer-project-builder
// ----------
  init_task_options(config,"phantomizer-project-builder",{
    clean_dir:[
      config.out_dir,
      config.meta_dir,
      config.export_dir,
      config.documentation_dir
    ],
    build_target:config.build_target,
    inject_extras:config.inject_extras,
    htmlcompressor:config.htmlcompressor,
    build_assets:config.build_assets,
    html_manifest:config.html_manifest,
    sitemap:config.sitemap,
    "web_domain":config.web_domain
  });
  init_target_options(config,"phantomizer-project-builder","dev",{
    "export_dir":config.export_dir+"/dev/www/",
    clean_dir:[
      config.out_dir,
      config.meta_dir,
      config.export_dir+"/dev/",
      config.documentation_dir
    ],
    "rm_files":[
      config.export_dir+"/dev/www/README.md"
    ],
    "rm_dir":[
      config.export_dir+"/dev/www/js/tests/"
    ]
  });
  init_target_options(config,"phantomizer-project-builder","staging",{
    "export_dir":config.export_dir+"/staging/www/",
    clean_dir:[
      config.out_dir,
      config.meta_dir,
      config.export_dir+"/staging/",
      config.documentation_dir
    ],
    "rm_files":[
      config.export_dir+"/staging/www/README.md"
    ],
    "rm_dir":[
      config.export_dir+"/staging/www/js/tests/"
    ]
  });
  init_target_options(config,"phantomizer-project-builder","contribution",{
    "export_dir":config.export_dir+"/contribution/www/",
    clean_dir:[
      config.out_dir,
      config.meta_dir,
      config.export_dir+"/contribution/",
      config.documentation_dir
    ],
    "rm_files":[
      config.export_dir+"/contribution/www/README.md"
    ],
    "rm_dir":[
      config.export_dir+"/contribution/www/js/tests/"
    ]
  });
  init_target_options(config,"phantomizer-project-builder","production",{
    "export_dir":config.export_dir+"/production/www/",
    clean_dir:[
      config.out_dir,
      config.meta_dir,
      config.export_dir+"/production/",
      config.documentation_dir
    ],
    "rm_files":[
      config.export_dir+"/production/www/README.md"
    ],
    "rm_dir":[
      config.export_dir+"/production/www/js/tests/"
    ]
  });

// initialize phantomizer-sitemap
// ----------
  init_task_options(config,"phantomizer-sitemap",{
  });

// initialize phantomizer-export-slim
// ----------
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


// pass it to grunt to parse all inlined options
  grunt.config.init(config);

  // return the parsed config
  return grunt.config.get();
}


// helper functions
// -------------
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
function init_task_options(config,task_name,options,files){
  if(!config[task_name]) config[task_name] = {options:{}};
  if(!config[task_name].options) config[task_name].options = {};
  underscore.defaults(config[task_name].options, options);
  if( files ){
    config[task_name].files = files;
  }
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
 * @param files
 */
function init_target_options(config,task_name,target_name,options,files){
  if(!config[task_name][target_name]) config[task_name][target_name] = {options:{}};
  if(!config[task_name][target_name].options) config[task_name][target_name].options = {};
  underscore.defaults(config[task_name][target_name].options,options);
  if( files ){
    config[task_name][target_name].files = files;
  }
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
