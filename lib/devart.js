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

var endpointURL = 'http://backend.deviantart.com/oembed?';
var xhtml_license = 'http://www.w3.org/1999/xhtml/vocab#license';

var getMedia = function(url) {
    return Promise.props({
        document: util.getDocument(url),
        oembed: util.getOEmbed(endpointURL, url),
    }).then(function(result) {
        var document = result.document;
        var oembed = result.oembed;
        var rdfaProcessor = new util.JsonRDFaProcessor();

        var policy, title, creator, identifier;
        var objects = [];

        rdfaProcessor.process(document);
        if (rdfaProcessor.graph[document.documentURI].hasOwnProperty(xhtml_license)) {
            policy = new media.Policy(null, rdfaProcessor.graph[document.documentURI][xhtml_license][0].value, null, null);
            // TODO: add copyright if no license (?)
        }

        title = new media.Title(oembed['title'], null, null);
        creator = new media.Creator(oembed['author_url'], oembed['author_name'], null, null);
        identifier = new media.Identifier(document.documentURI);

        objects = [
            // main image
            new media.Media(new media.Locator(oembed['url'], 'Exact match'),
                            new media.FrameSize(oembed['width'], oembed['height'], 'pixels'),
                            [identifier, title, creator]),
            // thumbnail
            new media.Media(new media.Locator(oembed['thumbnail_url'], 'Exact match'),
                            new media.FrameSize(oembed['thumbnail_width'], oembed['thumbnail_height'], 'pixels'),
                            [identifier, title, creator])
        ];

        // add policy to annotations, if it was found earlier
        if (policy) {
            objects.forEach(function(item) {
                item.annotations.push(policy);
            });
        }

        return objects;
    });
};

exports.getMedia = getMedia;
