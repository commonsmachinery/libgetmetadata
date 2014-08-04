
/* global describe, it, before */

var expect = require('expect.js');
var getMetadata = require('../libgetmetadata.js');

describe('flickr', function(){
    it('should load multiple objects', function(done){
        var url = 'https://www.flickr.com/photos/centralasian/8071729256';
        var maObjects;

        getMetadata(url).then(function(result) {
            maObjects = result;

            expect ( maObjects.length ).to.be( 2 );

            done();
        }).catch(function(err) {
            done(err);
        });
    })
});

describe('deviantArt', function(){
    it('should load multiple objects', function(done){
        var url = 'http://fav.me/d62zgjw';
        var maObjects;

        getMetadata(url).then(function(result) {
            maObjects = result;

            expect ( maObjects.length ).to.be( 2 );

            done();
        }).catch(function(err) {
            done(err);
        });
    })
});
