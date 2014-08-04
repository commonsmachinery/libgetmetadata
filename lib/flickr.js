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

var Promise = require('bluebird');
var util = require('./util.js');
var media = require('./media.js');

var endpointURL = 'https://www.flickr.com/services/oembed/?';
var xhtml_license = 'http://www.w3.org/1999/xhtml/vocab#license';

var getMedia = function(url) {
    return util.getOEmbed(endpointURL, url)
    .then(function(oembed) {
        var license, title, creator, identifier;
        var objects = [];

        title = new media.Title(
            oembed['title'],
            null,
            null,
            media.MappingType.exactMatch,
            'oembed'
        );
        creator = new media.Creator(
            oembed['author_url'],
            oembed['author_name'],
            null,
            null,
            media.MappingType.exactMatch,
            'oembed'
        );
        identifier = new media.Identifier(
            oembed['web_page'],
            media.MappingType.exactMatch,
            'oembed'
        );

        if (oembed.license_url) {
            license = new media.Policy(
                null,
                oembed.license_url,
                'license',
                'http://odrl.net/license/license.xml',
                media.MappingType.exactMatch,
                'oembed'
            );
        }

        objects = [
            // main image
            new media.Media(new media.Locator(oembed['url'], media.MappingType.exactMatch), [
                    new media.FrameSize(oembed['width'], oembed['height'], 'pixels'),
                    identifier,
                    title,
                    creator
                ], {oembed: oembed}),
            // thumbnail
            new media.Media(new media.Locator(oembed['thumbnail_url'], media.MappingType.exactMatch), [
                    new media.FrameSize(oembed['thumbnail_width'], oembed['thumbnail_height'], 'pixels'),
                    identifier,
                    title,
                    creator
                ], {oembed: oembed})
        ];

        // add policy if discovered
        if (license) {
            objects.forEach(function(item) {
                item.annotations.push(license);
            });
        }
        return objects;
    });
};

exports.getMedia = getMedia;
