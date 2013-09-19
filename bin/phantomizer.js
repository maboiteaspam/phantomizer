#!/usr/bin/env node

// load some modules
var fs = require("fs")
var path = require("path")
var optimist = require("optimist")
var grunt = require("grunt")
var ph_libutil = require("phantomizer-libutil")

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
                argv.export!=false ||
                argv.document!=false ||
                argv.clean!=false ||
                argv.version!=false ||
                false;
        })

        .argv
    ;

// let check we have some data to work on
var server = argv.server || ""
var init = argv.init || ""
var test = argv.test || ""
var export_ = argv.export || ""
var document_ = argv.document || ""
var clean = argv.clean || ""
var verbose = argv.verbose || false
var version = argv.version || false

console.log("Welcome to phantomizer..")

if( version ){
    console.log("phantomizer 0.1")
    process.exit(0)
}


// Did you want to start webserver
if( server != "" ){

    var project = server;

    if( project == "" ){
        console.log("Please input the project name");
        process.exit(code=0)
    }

    var lib = path.join(path.dirname(fs.realpathSync(__filename)), '../lib');
    var webserver = require(lib + '/webserver.js').webserver;

    var config = get_config(project+'/config.json');
    webserver = new webserver(process.cwd(), config);

    webserver.start(config.web_port,config.web_ssl_port);

// quit on enter touch pressed
    readline_toquit(function(){
        webserver.stop();
    });

}

if( test != "" ){

    var project = test;

    if( project == "" ){
        console.log("Please input the project name");
        process.exit(code=0)
    }

    var config = get_config(project+'/config.json');

    grunt.tasks(['phantomizer-qunit-runner'], {}, function(){

    });

    console.log("Test done !");
}

if( export_ != "" ){

    var project = export_;

    if( project == "" ){
        console.log("Please input the project name");
        process.exit(code=0)
    }

    var config = get_config(project+'/config.json');
    var t = [
        'phantomizer-build',
        'phantomizer-export-build'
    ];
    grunt.tasks(t, {}, function(){});

    console.log("Export done !");
}

if( document_ != "" ){

    var project = document_;

    if( project == "" ){
        console.log("Please input the project name");
        process.exit(code=0)
    }

    var config = get_config(project+'/config.json');
    var t = [
        'phantomizer-docco',
        'phantomizer-styledocco'
    ];
    grunt.tasks(t, {}, function(){
        console.log("Documentation done !");
    });

}

if( clean != "" ){

    var project = clean;

    if( project == "" ){
        console.log("Please input the project name");
        process.exit(code=0)
    }

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

    var project = init;

    if( project == "" ){
        console.log("Please input the project name");
        process.exit(code=0)
    }

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


function get_config( file ){

    function norm_path( path ){
        var os = require('os')
        if( os.type() == "Windows_NT"){
            path = path.replace("/","\\")
            path = path.replace("/","\\")
            path = path.replace("\\\\","\\")
            path = path.replace("\\\\","\\")
        }else{
            path = path.replace("\\","/")
            path = path.replace("\\","/")
            path = path.replace("//","/")
            path = path.replace("//","/")
        }
        return path
    }
    function make_absolute_path(base_dir, file){
        var os = require('os')
        file = norm_path( file )

        if( os.type() == "Linux" && file.substring(0,1) != "/" ){
            file = base_dir+"/"+file
        }else if( os.type() == "Windows_NT" && file.match("^[a-zA-Z]:","ig") == null ){
            file = base_dir+"/"+file
        }

        if( ! fs.existsSync(file) ){
            console.log("directory must exists")
            console.log(file)
            process.exit(0)
        }

        return norm_path( file )
    }

    var working_dir = process.cwd()
    var original_config = grunt.file.readJSON( file );
    var user_config = original_config.grunt;

    if( ! original_config["vendors_dir"] ){
        original_config["vendors_dir"] = require("phantomizer-websupport").www_vendors_path;
    }

    var v = {
        wd:working_dir
        ,src_dir:make_absolute_path(working_dir, original_config["src_dir"])
        ,wbm_dir:make_absolute_path(working_dir, original_config["wbm_dir"])
        ,vendors_dir:make_absolute_path(working_dir, original_config["vendors_dir"])
        ,out_dir:make_absolute_path(working_dir, original_config["out_dir"])
        ,meta_dir:make_absolute_path(working_dir, original_config["meta_dir"])
        ,export_dir:make_absolute_path(working_dir, original_config["export_dir"])
        ,documentation_dir:make_absolute_path(working_dir, original_config["documentation_dir"])
        ,project_dir:make_absolute_path(working_dir, original_config["project_dir"])
    }

    user_config["src_dir"] = v.src_dir;
    user_config["wbm_dir"] = v.wbm_dir;
    user_config["vendors_dir"] = v.vendors_dir;
    user_config["out_dir"] = v.out_dir;
    user_config["meta_dir"] = v.meta_dir;
    user_config["export_dir"] = v.export_dir;
    user_config["documentation_dir"] = v.documentation_dir;
    user_config["project_dir"] = v.project_dir;

    grunt.config.init(user_config);
    return grunt.config.get();
}


function readline_toquit( end_handler ){

    var readline = require('readline')
    var rl = readline.createInterface(process.stdin, process.stdout);

    rl.question('Press enter to leave...', function(answer) {
        console.log('See you soon !');
        if( end_handler != null ){
            end_handler()
        }
    });

}



