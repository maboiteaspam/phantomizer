
(function(){
// The module to be exported.
    var ph = {
        'delivery_queue':null,
        'webserver':null
    };

    for( var name in ph ){
        var t = require('./' + name + '.js');
        ph[name] = t[name]?t[name]:t
    }
    module.exports = ph;
})()
