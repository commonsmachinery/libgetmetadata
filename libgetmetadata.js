// -*- coding: utf-8 -*-
// libgetmetadata - Collect metadata for creative works from various sources.
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//          Artem Popov <artfwo@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var devArt = require('./lib/devart.js');

var notImplemented = {
    getMedia: function(url) {
        throw new Error("Couldn't find metadata module for site " + url);
    }
};

var siteModules = {
    '^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.deviantart\.com\/art\/.*': devArt,
    '^https?:\/\/fav.me\/.*': devArt,
    '^https?:\/\/sta.sh/.*': devArt,
    '^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*\.deviantart\.com\/.*?#\/d.*': devArt,
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
