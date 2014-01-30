var should = require('should');
var mylib = {
    version:"1.5.2"
}


describe('mylib', function () {
    it('should have a version with the format #.#.#', function() {
        mylib.version.should.match(/^\d+\.\d+\.\d+$/);
    });
});