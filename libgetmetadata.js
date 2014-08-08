// libgetmetadata - Collect metadata for creative works from various sources.
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var devart = require('./lib/devart.js');
var flickr = require('./lib/flickr.js');

var notImplemented = {
    getMedia: function(url) {
        throw new Error("Couldn't find metadata module for site " + url);
    }
};

var siteModules = {
    '^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.deviantart\.com\/art\/.*': devart,
    '^https?:\/\/fav.me\/.*': devart,
    '^https?:\/\/sta.sh/.*': devart,
    '^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.deviantart\.com\/.*?#\/d.*': devart,
    '^https?:\/\/(www\\.)?flickr\\.com/photos/': flickr,
    '.*': notImplemented
};

var getMetadata = function(url) {
    for (var k in siteModules) {
        if (url.match(new RegExp(k))) {
            return siteModules[k].getMedia(url);
        }
    }
};

module.exports = getMetadata;
