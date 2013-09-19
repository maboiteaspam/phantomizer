
(function(exports) {
	var html_builder = function(){
        this.inject_requirejs = function(base_url, script_name, buf, main){
            var ncontent = ""
            ncontent += ""
            if( script_name.substring ) script_name = [script_name]
            for(var n in script_name ){
                if( buf.match(base_url+script_name[n]) != null ){
                    if( main != null ) ncontent = "<script src='"+main+"'></script>"
                    buf = buf.replace("</body>", ncontent+"</body>")
                    return buf;
                }
            }
            if( script_name.length > 0 ){
                if( main != null ){
                    ncontent = "<script data-main=\""+main+"\" src='"+base_url+script_name[0]+"'></script>"
                }else{
                    ncontent = "<script src='"+base_url+script_name[0]+"'></script>"
                    ncontent += "<script>requirejs.config({baseUrl: '"+base_url+"'});</script>"
                }
                buf = buf.replace("</body>", ncontent+"</body>")
            }
            return buf
        };
        this.inject_phantom = function(buf){
            var ncontent = ""
            ncontent += "<script >"
            ncontent += "var is_phantom = true;" // to tell the test framework that we run under phantomjs so that is needs to pass information with special methods..
            ncontent += "</script>"
            buf = buf.replace("<head>", ncontent+"<head>")
            return buf
        };
        this.inject_qunit = function(base_url, script_name, buf){
            var ncontent = ""
            ncontent += "<link rel=\"stylesheet\" href=\"/js/vendors/go-qunit/qunit-1.11.0.css\">"
            buf = buf.replace("<head>", "<head>"+ncontent)

            ncontent = ""
            buf = this.inject_requirejs(base_url,script_name, buf)
            ncontent += "<script >"
            ncontent += "require(['vendors/go-qunit']);"
            ncontent += "</script>"
            buf = buf.replace("</body>", ncontent+"</body>")
            return buf
        };
        this.inject_device_preview = function(base_url, script_name, buf, device, device_mode){
            var ncontent = ""
            buf = this.inject_requirejs(base_url, script_name, buf, null)
            ncontent += '<script>'
            ncontent += 'require(["vendors/go-device-preview/device-preview"], function(DevicePreviewFacade){'
            ncontent +=         'if( $(".device").length == 0 ){$("#stryke-db").before("<div class=\'device\'></div>")}'
            ncontent +=         'var DevicePreview = new DevicePreviewFacade($(".device"));'
            ncontent +=         'DevicePreview.EnableDevice("'+device+'");'
            ncontent +=         'DevicePreview.EnableDeviceMode("'+device_mode+'");'
            ncontent += '})'
            ncontent += '</script>'
            buf = buf.replace("</body>", ncontent+"</body>")
            return buf
        }
        this.inject_dashboard = function(base_url, script_name, buf){
            var ncontent = ""
            ncontent += "<div id='stryke-db'></div>"
            buf = this.inject_requirejs(base_url, script_name,  buf, /*"/js/vendors/go-dashboard.js"*/ null)
            ncontent += '<script>'
            ncontent += 'require(["vendors/go-dashboard/dashboard-ui"], function($){'
            ncontent +=     'window.setTimeout(function(){'
            ncontent +=         '$("#stryke-db")'
            ncontent +=         '.hide()'
            ncontent +=         '.load_dashboard("/js/vendors/go-dashboard/dashboard.html", function(){'
            ncontent +=             '$("#stryke-db").dashboard().css("opacity",0).show().animate({opacity:100},1000);'
            ncontent +=         '});'
            ncontent +=     '},500);'
            ncontent += '})'
            ncontent += '</script>'
            buf = buf.replace("</body>", ncontent+"</body>")
            return buf
        }
	};
	
	
  // Expose the constructor function.
  exports.html_builder = new html_builder();
}(typeof exports === 'object' && exports || this));

