"use strict";

require([
    "vendors/go-phantomizer/phantomizer"
],function (phantomizer) {

    phantomizer.render(function(next){
        next();
    });
});
