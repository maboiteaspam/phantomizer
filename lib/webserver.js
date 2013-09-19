
'use strict';

(function(exports) {

    var os = require('os')
    var grunt = require('grunt')
    var fs = require("fs")
    var http = require('http')

    var ph_libutil = require("phantomizer-libutil")

    var http_utils = ph_libutil.http_utils;
    var html_utils = ph_libutil.html_utils;
    var file_utils = ph_libutil.file_utils;
    var html_builder = require("./html_builder").html_builder;
    var delivery_queue = require("./delivery_queue").delivery_queue;
    var meta_factory = ph_libutil.meta;
	
    var webserver = function(working_dir, user_config){

// -
        var requirejs_src = user_config.scripts.requirejs.src
        var requirejs_baseUrl = user_config.scripts.requirejs.baseUrl


// -
        var meta_manager = new meta_factory(working_dir)

// manage congestion and bdw
        var min_congestion = 0;
        var max_congestion = 0;
        var cur_bdw = 0;
        var is_phantomizing = false;
        var dashboard_enabled = true;
        var build_enabled = true;
        var assets_injection_enabled = true;

        var deliverer = new delivery_queue()

        function debug_console(msg){
            // console.log(msg)
        }
// -
        var connect = require('connect')
        var app = connect()
        app.use(connect.query())
        app.use(connect.urlencoded())
        if( user_config.log ){
            app.use(connect.logger('dev'))
        }


// -
        app.use("/pong", function(req, res, next){
            var headers = {
                'Content-Type': 'application/json'
            };
            res.writeHead(req.body.response_code || 404, headers)
            res.end(req.body.response_body)
        })



// -
        app.use("/stryke_get_max_congestion", function(req, res, next){
            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(200, headers)
            res.end(max_congestion+"ms")
        })
        app.use("/stryke_max_congestion", function(req, res, next){

            var request_path = get_request_path( req.originalUrl )

            var n = request_path.substring(("/stryke_max_congestion/").length)
            var n = n.substring(0,n.length-2)
            max_congestion = parseInt(n)
            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(200, headers)
            res.end("ok")
        })
        app.use("/get_stryke_min_congestion", function(req, res, next){
            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(200, headers)
            res.end(min_congestion+"ms")
        })
        app.use("/stryke_min_congestion", function(req, res, next){
            var request_path = get_request_path( req.originalUrl )
            var n = request_path.substring(("/stryke_min_congestion/").length)
            var n = n.substring(0,n.length-2)
            min_congestion = parseInt(n)
            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(200, headers)
            res.end("ok")
        })
        app.use("/stryke_get_bdw", function(req, res, next){
            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(200, headers)
            res.end(cur_bdw+"k")
        })
        app.use("/stryke_bdw", function(req, res, next){

            var request_path = get_request_path( req.originalUrl )
            var n = request_path.substring(("/stryke_bdw/").length)
            var n = n.substring(0,n.length-1)

            cur_bdw = parseInt(n)
            deliverer.set_bdw( n )
            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(200, headers)
            res.end("ok")
        })

// clear build cache
        app.use("/stryke_clean", function(req, res, next){
            var grunt = require('grunt')

            file_utils.deleteFolderRecursive(user_config.out_dir)
            grunt.file.mkdir(user_config.out_dir)

            file_utils.deleteFolderRecursive(user_config.meta_dir)
            grunt.file.mkdir(user_config.meta_dir)

            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(200, headers)
            res.end("ok")
        })

// generate documentation for css and scripts
        app.use("/sryke_generate_documentation", function(req, res, next){
            var headers = {
                'Content-Type': 'text/html'
            };
            grunt.tasks(["phantomizer-docco","phantomizer-styledocco"], {}, function(){
                res.writeHead(200, headers)
                res.end("ok")
            });
        })

// check requests within documentation dir
        app.use("/stryke_doc", function(req, res, next){
            var found = false
            var request_path = get_request_path( req.originalUrl )

            var path = user_config.documentation_dir+request_path
            if( request_path.substring(0,("/stryke_doc").length) == "/stryke_doc"){
                request_path = request_path.substring(("/stryke_doc").length)
                path = user_config.documentation_dir+request_path
            }

            if( grunt.file.isFile(path) ){
                var headers = {
                    'Content-Type': http_utils.header_content_type(request_path)
                };
                res.writeHead(200, headers)
                res.end( fs.readFileSync(path))
                found = true
            }else if( grunt.file.isDir(path) ){
                var items = http_utils.read_dir(user_config.documentation_dir, request_path);
                var buf = ""
                for(var i in items) {
                    buf += "<a href='/stryke_doc"+items[i].path+"'>"+items[i].name+"</a><br/>"
                }
                res.end(buf)
                found = true
            }

            if( ! found ) next()
        })

// -
        app.use(function(req, res, next){
            var request_path = req.originalUrl
            debug_console(">> "+request_path)
            if( request_path.indexOf("?")>-1){
                request_path = request_path.substring(0,request_path.indexOf("?"))
            }

            var file = file_utils.find_file([user_config.out_dir],request_path)

            if( file != null ){

                var respond = write_handler(max_congestion,min_congestion,deliverer);

                var headers = {
                    'Content-Type': http_utils.header_content_type(file)
                };

                if( headers["Content-Type"].indexOf("text/html") == -1 ){
                    var buf = null
                    if( build_enabled
                        && is_built(meta_manager, user_config, req, request_path) ){
                        if( is_build_fresh(meta_manager, user_config, req, request_path) ){
                            buf = fs.readFileSync(file)
                            respond(200, headers, buf, res)
                        }else{
                            regen_build(user_config, working_dir, req, request_path, function(path, buf){
                                respond(200, headers, buf, res)
                            })
                        }
                    }else{
                        buf = fs.readFileSync(file)
                        respond(200, headers, buf, res)
                    }
                }else{
                    next()
                }

            }else{
                next()
            }
        })

// -
        app.use(function(req, res, next){
            var request_path = req.originalUrl
            debug_console(">> "+request_path)
            if( request_path.indexOf("?")>-1){
                request_path = request_path.substring(0,request_path.indexOf("?"))
            }

            var file = file_utils.find_file(user_config.web_paths,request_path)

            if( file != null ){

                var respond = write_handler(max_congestion,min_congestion,deliverer);

                var headers = {
                    'Content-Type': http_utils.header_content_type(file)
                };
                var buf = null
                if( headers["Content-Type"].indexOf("text/html") > -1 ){
                    if( build_enabled && is_build_required(req) ){
                        if( is_built(meta_manager, user_config, req, request_path)
                            && is_build_fresh(meta_manager, user_config, req, request_path) ){
                            regen_build(user_config, working_dir, req, request_path, function(path, buf){
                                buf = inject_extras(req, request_path, buf)
                                respond(200, headers, buf, res)
                            })
                        }else{
                            do_build(user_config, working_dir, req, request_path, function(path, buf){
                                buf = inject_extras(req, request_path, buf)
                                respond(200, headers, buf, res)
                            })
                        }
                    }else{
                        buf = fs.readFileSync(file).toString()
                        if( is_top_request(req, request_path, buf) ){
                            if( assets_injection_enabled )
                                buf = inject_assets(user_config, request_path, buf)
                            buf = inject_extras(req, request_path, buf)
                        }
                        respond(200, headers, buf, res)
                    }
                }else{
                    buf = fs.readFileSync(file)
                    respond(200, headers, buf, res)
                }

            }else{
                next()
            }
        })
        app.use(function(req, res, next){
            var request_path = req.originalUrl;
            debug_console(">> "+request_path)
            if( request_path.indexOf("?")>-1){
                request_path = request_path.substring(0,request_path.indexOf("?"))
            }


            var file = file_utils.find_dir(user_config.web_paths, request_path)
            if( file != null ){
                var items = http_utils.merged_dirs(user_config.web_paths, request_path);
                var buf = ""
                for(var i in items) {
                    buf += "<a href='"+items[i].path+"'>"+items[i].name+"</a><br/>"
                }
                var headers = {
                    'Content-Type': 'text/html'
                };
                var respond = write_handler(max_congestion,min_congestion,deliverer);
                respond(200, headers, buf, res);
            }else if( request_path == "/" ){
                var items = http_utils.merged_dirs(user_config.web_paths, "/");
                var buf = ""
                for(var i in items) {
                    buf += "<a href='"+items[i].path+"'>"+items[i].name+"</a><br/>"
                }
                var headers = {
                    'Content-Type': 'text/html'
                };
                var respond = write_handler(max_congestion,min_congestion,deliverer);
                respond(200, headers, buf, res);
            }else{
                next()
            }
        })

// -
        app.use(function(req, res){
            var headers = {
                'Content-Type': 'text/html'
            };
            res.writeHead(404, headers)
            res.end("not found")
        })


        this.is_phantom = function( is_phantom ){
            is_phantomizing = is_phantom;
        };
        var wserver = null;
        var wsserver = null;
        this.start = function(port, ssl_port){
            wserver = http.createServer(app).listen(port);
            if( ssl_port )
                wsserver = http.createServer(app).listen(ssl_port);
        };
        this.stop = function(){
            if( wserver !== null )
            wserver.close();
            if( wsserver !== null )
            wsserver.close();
        };
        this.stop = function(){
            grunt.util.exit(0);
        };
        this.enable_dashboard = function(enabled){
            dashboard_enabled = !!enabled;
        };
        this.enable_build = function(enabled){
            build_enabled = !!enabled;
        };
        this.enable_assets_inject = function(enabled){
            assets_injection_enabled = !!enabled;
        };


        function is_build_required(req){
            return req.query.build_profile
                || false;
        }
        function is_top_request( req, request_path, buf){
            var request_dir = request_path.substring(0,request_path.lastIndexOf("/")+1)
            var j = true
            j = j && request_path.substring(request_path.length-5)==".html"
            j = j && request_dir.substring(request_path.length-8)!="/layout/"
            j = j && request_dir.substring(0, 8)!="/layout/"
            j = j && request_path.substring(0, ("/stryke_doc").length)!="/stryke_doc"
            j = j && request_path.substring(0, ("/js/").length)!="/js/"
            j = j && buf.match("</body>")!=null
            return j
        }
        function is_dashboard_friend( req, request_path, buf){
            var j = true
            j = j && is_top_request(req, request_path, buf)
            j = j && req.headers["x-requested-with"]!='XMLHttpRequest'
            return j && req.query.no_dashboard==undefined
        }
        function is_previewing_device( req, request_path, buf){
            var j = true
            j = j && is_top_request(req, request_path, buf)
            j = j && req.headers["x-requested-with"]!='XMLHttpRequest'
            return j && req.query.device_mode!==undefined && req.query.device!==undefined
        }
        function test_required(req){
            return req.query.spec_files || false
        }
        function inject_assets(options, request_path, html_content){
            // look up for scripts to strip / merge / inject
            var path = require('path')
            var base_url = request_path.substring(0,request_path.lastIndexOf("/")) || "/"
            if( options.scripts ){
                if( options.scripts.append ){
                    for( var target_merge in options.scripts.append ){
                        if( target_merge.length == 1 ){
                            html_content = html_utils.append_script(target_merge, html_content )
                            grunt.verbose.ok("scripts injected "+target_merge+", append")
                        }
                    }
                }
                if( options.scripts.prepend ){
                    for( var target_merge in options.scripts.prepend ){
                        if( target_merge.length == 1 ){
                            var anchor = html_utils.script_anchor(html_content, base_url)
                            html_content = html_utils.prepend_script(target_merge, html_content, anchor)
                            grunt.verbose.ok("css injected "+target_merge+", prepend")
                        }
                    }
                }
                if( options.scripts.append ){
                    for( var target_merge in options.scripts.append ){
                        if( target_merge.length > 1 ){
                            var asset_deps = options.scripts.append[target_merge]
                            merge_files(target_merge, asset_deps, options.out_dir, options.meta_dir, options.build_run_paths)
                            html_content = html_utils.strip_scripts(asset_deps, html_content, base_url)
                            html_content = html_utils.append_script(target_merge, html_content )
                            grunt.verbose.ok("scripts merged "+target_merge+", append")
                        }
                    }
                }
                if( options.scripts.prepend ){
                    for( var target_merge in options.scripts.prepend ){
                        if( target_merge.length > 1 ){
                            var asset_deps = options.scripts.prepend[target_merge]
                            merge_files(target_merge, asset_deps, options.out_dir, options.meta_dir, options.build_run_paths)
                            html_content = html_utils.strip_scripts(asset_deps, html_content, base_url)
                            var anchor = html_utils.script_anchor(html_content, base_url)
                            html_content = html_utils.prepend_script(target_merge, html_content, anchor)
                            grunt.verbose.ok("css merged "+target_merge+", prepend")
                        }
                    }
                }
                if( options.scripts.strip ){
                    html_content = html_utils.strip_scripts(options.scripts.strip, html_content, base_url )
                    grunt.verbose.ok("scripts striped")
                }
            }
            if( options.css ){
                if( options.css.append ){
                    for( var target_merge in options.css.append ){
                        if( target_merge.length == 1 ){
                            html_content = html_utils.append_css(target_merge, html_content )
                            grunt.verbose.ok("css injected "+target_merge+", append")
                        }
                    }
                }
                if( options.css.prepend ){
                    for( var target_merge in options.css.prepend ){
                        if( target_merge.length == 1 ){
                            var anchor = html_utils.css_anchor(html_content, base_url)
                            html_content = html_utils.prepend_css(target_merge, html_content, anchor)
                            grunt.verbose.ok("css injected "+target_merge+", prepend")
                        }
                    }
                }
                if( options.css.append ){
                    for( var target_merge in options.css.append ){
                        if( target_merge.length > 1 ){
                            var asset_deps = options.css.append[target_merge]
                            merge_files(target_merge, asset_deps, options.out_dir, options.meta_dir, options.build_run_paths)
                            html_content = html_utils.strip_css(asset_deps, html_content, base_url)
                            html_content = html_utils.append_css(target_merge, html_content )
                            grunt.verbose.ok("css merged "+target_merge+", append")
                        }
                    }
                }
                if( options.css.prepend ){
                    for( var target_merge in options.css.prepend ){
                        if( target_merge.length > 1 ){
                            var asset_deps = options.css.prepend[target_merge]
                            merge_files(target_merge, asset_deps, options.out_dir, options.meta_dir, options.build_run_paths)
                            html_content = html_utils.strip_css(asset_deps, html_content, base_url)
                            var anchor = html_utils.css_anchor(html_content, base_url)
                            html_content = html_utils.prepend_css(target_merge, html_content, anchor)
                            grunt.verbose.ok("css merged "+target_merge+", prepend")
                        }
                    }
                }
                if( options.css.strip ){
                    html_content = html_utils.strip_css(options.css.strip, html_content, base_url )
                    grunt.verbose.ok("css striped")
                }
            }
            return html_content;
        };

        function inject_extras(req, request_path, buf){
            if( dashboard_enabled && is_dashboard_friend(req, request_path, buf) ){
                buf = html_builder.inject_dashboard(requirejs_baseUrl, requirejs_src, buf)
            }
            if( is_previewing_device(req, request_path, buf) ){
                buf = html_builder.inject_device_preview(requirejs_baseUrl, requirejs_src,  buf, req.query.device,req.query.device_mode)
            }
            if( test_required(req) ){
                if( is_phantomizing ){
                    buf = html_builder.inject_phantom( buf);
                }
                buf = html_builder.inject_qunit(requirejs_baseUrl, requirejs_src, buf);
            }
            return buf;
        }

    };

    function write_handler(max_congestion,min_congestion,deliverer){
        return function(code, headers, buf, res){
            res.writeHead(code, headers)
            var congestion = Math.floor((Math.random()*max_congestion)+min_congestion);
            setTimeout(function(){
                deliverer.enqueue(buf, res)
            }, congestion);
        };
    }

    function get_request_path( request_path ){
        if( request_path.indexOf("?")>-1){
            request_path = request_path.substring(0,request_path.indexOf("?"))
        }
        return request_path
    }


    function is_built(meta_manager, user_config, req, request_path){
        var retour = false

        var build_profile = req.query.build_profile || ""
        build_profile=build_profile==""?"":"-"+build_profile
        var meta_request_path = user_config.meta_dir+request_path+".meta"+build_profile
        var path = user_config.out_dir+request_path+build_profile
        if( meta_manager.has(meta_request_path) ){
            retour = grunt.file.isFile(path)
        }
        return retour
    }
    function is_build_fresh(meta_manager, user_config, req, request_path){
        var retour = false

        var build_profile = req.query.build_profile || ""
        build_profile=build_profile==""?"":"-"+build_profile
        var meta_request_path = user_config.meta_dir+request_path+".meta"+build_profile
        var path = user_config.out_dir+request_path+build_profile

        if( meta_manager.has(meta_request_path) ){
            var entry = meta_manager.load(meta_request_path)

            retour = entry.is_fresh()

            if( retour ){
                retour = grunt.file.isFile(path)
            }
        }
        return retour
    }
    var regen_count  = 0
    function regen_build(user_config, working_dir, req, request_path, built_hdl){

        var build_profile = req.query.build_profile || ""
        build_profile=build_profile==""?"":"-"+build_profile

        var out_file = user_config.out_dir+request_path+build_profile
        var meta_file = user_config.meta_dir+request_path+".meta"+build_profile

        var options = grunt.file.readJSON(meta_file)

        var tasks_json_file = user_config.meta_dir+request_path+"-"+build_profile+".json";
        var r_tasks_json_file = file_utils.relative_path(tasks_json_file, working_dir);
        var tasks = []
        var tasks_options = {}
        for( var i in options.build ){
            for(var task_name in options.build[i] ){
                var rtask_options = options.build[i][task_name]
                var task_target = "jit-build"+regen_count
                task_name = task_name.split(':')
                task_name = task_name[0]

                if( ! tasks_options[task_name] )
                    tasks_options[task_name] = {}
                tasks_options[task_name][task_target] = {options:rtask_options}
                regen_count++
                tasks.push("loader_builder:"+r_tasks_json_file+":"+task_name+":"+task_target)
            }
        }

        grunt.file.write( tasks_json_file, JSON.stringify(tasks_options, null, 4) )

        grunt.tasks(tasks, {}, function(){
            if( built_hdl != null ){
                built_hdl(out_file, grunt.file.read(out_file))
            }
        });
    }
    function do_build(user_config, working_dir, req, request_path, built_hdl){
        var build_profile = req.query.build_profile || ""
        var str_build_profile=build_profile==""?"":"-"+build_profile

        var options = grunt.util._.clone(user_config)

        var out_file = user_config.out_dir+request_path+str_build_profile
        var meta_file = user_config.meta_dir+request_path+str_build_profile

        options["phantomizer-html-builder"] = options["phantomizer-html-jitbuild"]
        options["phantomizer-html-builder"][build_profile] = {
            options:{
                in_request: request_path
                ,build_profile: build_profile
                ,out_file: out_file
                ,meta_file: meta_file
            }
        }

        var json_file = user_config.meta_dir+request_path+str_build_profile+".json"
        grunt.file.write( json_file, JSON.stringify(options, null, 4) )
        json_file = file_utils.relative_path(json_file, working_dir);


        grunt.tasks(["loader_builder:"+json_file+":phantomizer-html-builder:"+build_profile+":"+request_path], options, function(){
            if( built_hdl != null ){
                built_hdl(out_file, grunt.file.read(out_file))
            }
        });
    }




    function merge_files(target_merge, deps, out_path, meta_path, paths, current_grunt_task, current_grunt_opt){
        var MetaManager = new meta_factory( process.cwd() )

        var entry_path = meta_path+target_merge+".meta";
        var target_path = out_path+target_merge+"";
        if(MetaManager.is_fresh(entry_path) == false ){
            // materials required to create cache entry
            var entry = MetaManager.create([])


            if ( grunt.file.exists(process.cwd()+"/Gruntfile.js")) {
                entry.load_dependencies([process.cwd()+"/Gruntfile.js"])
            }
            entry.load_dependencies([target_path])

            var merge_content = ""
            for( var n in deps ){
                var file_dep = file_utils.find_file(paths, deps[n])
                if( file_dep != false ){
                    merge_content += grunt.file.read(file_dep)
                    entry.load_dependencies([file_dep])
                }
            }
            grunt.file.write(target_path, merge_content)

            // create a cache entry, so that later we can regen or check freshness
            entry.require_task(current_grunt_task, current_grunt_opt)
            entry.save(entry_path)
        }

    }



    // Expose the constructor function.
    exports.webserver = webserver;
}(typeof exports === 'object' && exports || this));




