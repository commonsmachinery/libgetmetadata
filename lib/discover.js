// libgetmetadata - Collect metadata for creative works from various sources.
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var Promise = require('bluebird');
var util = require('./util.js');
var media = require('./media.js');
var _ = require('underscore');

var getRDFaProperty = function(graph, subject, predicates) {
    var result = [];

    if (graph[subject]) {
        for (var p = 0; p < predicates.length; p++) {
            var predicate = predicates[p];
            var objs = graph[subject][predicate];

            if (objs) {
                for (var i = 0; i < objs.length; i++) {
                    if (objs[i].type === 'literal') {
                        // TODO: check xml:lang
                        result.push(objs[i].value);
                    } else if (objs[i].type === 'uri') {
                        result.push(objs[i].value);
                    }
                }
            }
        }
    }

    return result;
}

var processRDFa = function(document, rdfa) {
    var elements, element, id, src, subject, maObjects = [];

    // For now, just look at images.  We can't do this much smarter since
    // we must decode img.src URIs to get a uniform encoding of them.
    elements = document.querySelectorAll('img');

    for (var i = 0; i < elements.length; i++) {
        element = elements[i];
        subject = null;

        if (element.id) {
            id = document.documentURI + element.id;
            if (id in rdfa) {
                subject = id;
            }
        }

        if (!subject && element.src) {
            src = decodeURIComponent(element.src); // Get rid of any % escapes
            if (src in rdfa) {
                subject = src;
            }
        }

        if (subject) {
            var mo = new media.Media(new media.Locator(subject, media.MappingType.exactMatch), [], {rdfa: rdfa});

            var title = getRDFaProperty(rdfa, subject, [
                'http://purl.org/dc/elements/1.1/title',
                'http://purl.org/dc/terms/title',
            ]);

            if (title) {
                mo.annotations.push(new media.Title(
                    title[0],
                    null,
                    null,
                    media.MappingType.exactMatch,
                    'rdfa'
                ));
            }

            var creator = getRDFaProperty(rdfa, subject, [
                'http://purl.org/dc/elements/1.1/creator',
                'http://purl.org/dc/terms/creator',
                'http://creativecommons.org/ns#attributionName',
            ]);

            var creatorLink = getRDFaProperty(rdfa, subject, [
                'http://creativecommons.org/ns#attributionURL',
            ])

            if (creator) {
                mo.annotations.push(new media.Creator(
                    creatorLink[0],
                    creator[0],
                    null,
                    null,
                    media.MappingType.exactMatch,
                    'rdfa'
                ));
            }

            var policyLink = getRDFaProperty(rdfa, subject, [
                'http://www.w3.org/1999/xhtml/vocab#license',
                'http://creativecommons.org/ns#license',
                'http://purl.org/dc/terms/license',
            ])

            if (policyLink) {
                mo.annotations.push(new media.Policy(
                    null,
                    policyLink,
                    'license',
                    null,
                    media.MappingType.exactMatch,
                    'rdfa'
                ));
            }
            maObjects.push(mo);
        }
    } // elements metadata

    // process document and OpenGraph metadata
    subject = document.documentURI;

    if (rdfa[subject]) {
        var mo = new media.Media(new media.Locator(subject, media.MappingType.exactMatch), [], {rdfa: rdfa});

        var title = getRDFaProperty(rdfa, subject, [
            'http://purl.org/dc/elements/1.1/title',
            'http://purl.org/dc/terms/title',
            'http://ogp.me/ns#title',
        ]);

        if (title) {
            mo.annotations.push(new media.Title(
                title[0],
                null,
                null,
                media.MappingType.exactMatch,
                'rdfa'
            ));
        }

        var identifier = getRDFaProperty(rdfa, subject, [
            'http://ogp.me/ns#url',
        ]);

        if (identifier) {
            mo.annotations.push(new media.Identifier(
                identifier[0],
                media.MappingType.exactMatch,
                'rdfa'
            ));
        }

        var creator = getRDFaProperty(rdfa, subject, [
            'http://purl.org/dc/elements/1.1/creator',
            'http://purl.org/dc/terms/creator',
            'http://creativecommons.org/ns#attributionName',
        ]);

        var creatorLink = getRDFaProperty(rdfa, subject, [
            'http://creativecommons.org/ns#attributionURL',
        ])

        if (creator) {
            mo.annotations.push(new media.Creator(
                creatorLink[0],
                creator[0],
                null,
                null,
                media.MappingType.exactMatch,
                'rdfa'
            ));
        }

        var policyLink = getRDFaProperty(rdfa, subject, [
            'http://www.w3.org/1999/xhtml/vocab#license',
            'http://creativecommons.org/ns#license',
            'http://purl.org/dc/terms/license',
        ])

        if (policyLink) {
            mo.annotations.push(new media.Policy(
                null,
                policyLink,
                'license',
                null,
                media.MappingType.exactMatch,
                'rdfa'
            ));
        }

        maObjects.push(mo);
    } // document metadata
    return maObjects;
}

var processOEmbed = function(oembed, url) {
    var maObjects = [];
    var commonMetadata = [];
    var mo, title, creator, identifier, locator, annotations;

    if (oembed['title']) {
        commonMetadata.push(new media.Title(
            oembed['title'],
            null,
            null,
            media.MappingType.exactMatch,
            'oembed'
        ));
    }

    if (oembed['author_name']) {
        commonMetadata.push(new media.Creator(
            oembed['author_url'],
            oembed['author_name'],
            null,
            null,
            media.MappingType.exactMatch,
            'oembed'
        ));
    }

    maObjects = [];

    if (oembed['thumbnail_url']) {
        locator = new media.Locator(oembed['thumbnail_url'], media.MappingType.exactMatch);
        annotations = commonMetadata.concat([
            new media.FrameSize(oembed['thumbnail_width'], oembed['thumbnail_height'], 'pixels')
        ]);

        mo = new media.Media(locator, annotations, {oembed: oembed});
        maObjects.push(mo);
    }

    locator = new media.Locator(url, media.MappingType.exactMatch);
    annotations = commonMetadata.concat([
        new media.FrameSize(oembed['width'], oembed['height'], 'pixels')
    ]);

    mo = new media.Media(locator, annotations, {oembed: oembed});
    maObjects.push(mo);


    return maObjects;
}

var getMedia = function(url) {
    return util.getDocument(url)
    .then(function(document) {
        var rdfaProcessor, oembedLink, props = {};

        rdfaProcessor = new util.JsonRDFaProcessor();
        rdfaProcessor.process(document);
        if (rdfaProcessor.graph) {
            props.rdfa = Promise.resolve(processRDFa(document, rdfaProcessor.graph))
        }

        var oembedLink = document.querySelector('head > link[rel="alternate"][type="application/json+oembed"]');
        if (oembedLink) {
            var oembedURL = oembedLink.attributes.href.value;
            props.oembed = util.getOEmbed(oembedURL)
                .then(function(oembed) {
                    return(processOEmbed(oembed, url));
                });
        }

        return Promise.props(props);
    })
    .then(function(result) {
        var maObjects = [];

        if (result.rdfa) {
            for (var i = 0; i < result.rdfa.length; i++) {
                var mo = result.rdfa[i];
                maObjects.push(mo);
            }
        }

        // merge oembed metadata for Media objects with matching locators
        if (result.oembed) {
            for (var i = 0; i < result.oembed.length; i++) {
                var mo = result.oembed[i];
                var merged = false;

                for (var j = 0; j < maObjects.length; j++) {
                    if (maObjects[j].locator.locatorLink == result.oembed[i].locator.locatorLink) {
                        maObjects[j].annotations = maObjects[j].annotations.concat(result.oembed[i].annotations);
                        _.extend(maObjects[j].metadata, result.oembed[i].metadata);
                        merged = true;
                    }
                }

                if (!merged) {
                    maObjects.push(mo);
                }
            }
        }

        return maObjects;
    });
};

exports.getMedia = getMedia;
