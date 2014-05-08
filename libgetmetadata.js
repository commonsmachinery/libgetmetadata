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

var _nodejs = (typeof module !== 'undefined' && typeof module.exports !== 'undefined');

if (_nodejs) {
    var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
    var jsdom = require('jsdom');
    var Promise = require('bluebird');
    var uuid = require('uuid');
}

var RDFaProcessor = require('./rdfa-glue.js').JsonRDFaProcessor;

var oembedPropertyMap = {
    'title': {
        property: 'http://purl.org/dc/elements/1.1/title',
        type: 'literal'
    },
    'web_page': {
        property: 'http://ogp.me/ns#url',
        type: 'uri'
    },
    'author_name': {
        property: 'http://creativecommons.org/ns#attributionName',
        type: 'literal'
    },
    'author_url': {
        property: 'http://creativecommons.org/ns#attributionURL',
        type: 'uri'
    },
    'license_url': {
        property: 'http://www.w3.org/1999/xhtml/vocab#license',
        type: 'uri'
    }
};

var addTriple = function(graph, subject, predicate, object) {
    var object = validateObject(object);

    if (!graph.hasOwnProperty(subject)) {
        graph[subject] = {};
    }

    if (!graph[subject].hasOwnProperty(predicate)) {
        graph[subject][predicate] = [];
    }

    // do not add if triple is already in the graph
    for (var i = 0; i < graph[subject][predicate].length; i++) {
        var o = graph[subject][predicate][i];
        if (o.type == object.type && o.value == object.value && o.lang == object.lang) {
            return;
        }
    }

    graph[subject][predicate].push(object);
}

function Metadata(document, rules) {
    this.rdfa = {};
    this.og = {};
    this.oembed = {};
    this.rules = rules;

    this.document = document;
}

Metadata.prototype.getRDFaMetadata = function(subject) {
    var result = {};
    result[subject] = this.rdfa[subject];
    return result;
}

Metadata.prototype.getMetadata = function() {
    var result = {};

    var subjects = this.discoverSubjectElements();

    for (var s in this.rdfa) {
        for (var p in this.rdfa[s]) {
            for (var i = 0; i < this.rdfa[s][p].length; i++) {
                var o = this.rdfa[s][p][i];
                addTriple(result, s, p, o);
            }
        }
    }

    for (var s in this.og) {
        for (var p in this.og[s]) {
            for (var i = 0; i < this.og[s][p].length; i++) {
                var o = this.rdfa[s][p][i];
                addTriple(result, s, p, o);
            }
        }
    }

    // add oembed in a graph form to result
    var oembedSubject = this.document.documentURI;
    for (var key in this.oembed) {
        var propertyName = null;
        var propertyType = null;

        if (oembedPropertyMap[key]) {
            propertyName = oembedPropertyMap[key].property;
            propertyType = oembedPropertyMap[key].type;
        }

        if (this.rules && this.rules.oembed && this.rules.oembed.map && this.rules.oembed.map[key]) {
            propertyName = this.rules.oembed.map[key].property;
            propertyType = this.rules.oembed.map[key].type;
        }

        var oembedObject = ({
            type: propertyType,
            value: oembed[key],
            datatype: propertyType == 'literal' ? "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral" : undefined
        });

        if (propertyName) {
            addTriple(result, oembedSubject, propertyName, oembedObject);
        }
    }

    return result;
}

/**
 * Discover elements and subjects based on standards, rather than
 * knowledge about a specific page.
 *
 * Image element subjects are located with this heuristic:
 *
 * * If the element has an id, look for '#id'
 * * If the element has a src, look for that URI
 * * If the element src is the unique object of an og:image triplet,
 *   use the subject of the triplet.
 */
Metadata.prototype.discoverSubjectElements = function() {
    var result = [];

    // For now, just look at images.  We can't do this much smarter since
    // we must decode img.src URIs to get a uniform encoding of them.
    var elements = this.document.querySelectorAll('img');

    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];

        var subject = null;
        var main = false;

        if (element.id && this.rdfa.hasOwnProperty(element.id)) {
            subject = this.document.documentURI + '#' + element.id;
        }

        var src = decodeURIComponent(element.src);
        if (src && this.rdfa.hasOwnProperty(src)) {
            subject = src;
        }

        if (!subject) {
            var og_image = this.og[this.document.documentURI]["http://ogp.me/ns#image"];

            /*if (subjects.length === 1) {
                subject = document.data.getSubject(subjects[0]);
                main = true;
                console.debug('found subject on og:image: ' + subject.id);
            }*/
        }

        if (!subject) {
            if (this.oembed.url == src) {
                subject = src;
                main = true;
            }
        }

        if (subject) {
            result.push({
                element: element,
                subject: subject,
                id: uuid.v4(),
                main: main,
                //mainElementSelector: null,
                //overlays: null
            });
        }
    }

    return result;
};

Metadata.prototype.rewriteMainSubject = function() {
    var sources, i, arg, element, objects, oembedParameter;

    var doRewrite = function(el, newURI, source) {
        console.debug(source + ': rewriting ' + el.subject.id + ' to ' + newURI);

        el.subject.id = newURI;

        // Also add the new name to the graph, so serialisation can work
        document.data.graph.subjects[newURI] = el.subject;
    };

    if (!(this.rules.rewriteMainSubject)) {
        return;
    }

    sources = typeof this.rules.rewriteMainSubject === 'string' ?
        [this.rules.rewriteMainSubject] : this.rules.rewriteMainSubject;

    for (i = 0; i < sources.length; i++) {
        if (sources[i].indexOf('oembed:') === 0) {
            // use parameter from oembed data, typically web_page
            arg = sources[i].slice(7);
            oembedParameter = this.oembed[arg];
            if (oembedParameter) {
                doRewrite(el, oembedParameter, sources[i]);
                return;
            }
        }
        else if (sources[i].indexOf('rdf:') === 0) {
            // Find a triple with this predicate
            arg = sources[i].slice(4);
            objects = el.subject.getValues(arg);

            if (objects.length === 1 && objects[0]) {
                doRewrite(el, objects[0], sources[i]);
                return;
            }
        }
        else if (sources[i].indexOf('link:') === 0) {
            // Find a link with this attribute
            arg = sources[i].slice(5);
            element = document.querySelector('link[' + arg + ']');

            if (element && element.href) {
                doRewrite(el, element.href, sources[i]);
                return;
            }
        }
        else {
            console.warn('unknown subject rewrite source: ' + sources[i]);
        }
    }
}

Metadata.prototype.toString = function() {
    return JSON.stringify(this.getMetadata());
}

/**
 * Fetch and parse HTML document from the specified URI,
 * calling callback(error, document) when done.
 */
var _getDocument = function(uri, callback) {
    var req = new XMLHttpRequest();
    var document;

    req.open('GET', uri, true);

    req.onload = function() {
        if (_nodejs) {
            document = new jsdom.jsdom(req.responseText);
            document.documentURI = uri;
        } else {
            document = req.responseXML;
        }

        callback(null, document);
    };

    req.onerror = function() {
        callback(new Error('Error opening URI ' + uri), null);
    };

    req.send();
}

/**
 * Get RDFa metadata from the document.
 */
var getMetadataFromDOM = function(document, options, rules) {
    var processor = new RDFaProcessor();
    processor.process(document);

    return {rdfa: processor.rdfa, og: processor.og};
}

exports.getMetadataFromDOM = getMetadataFromDOM;

/**
 * Return oembed URL using <link rel="alternate"> tags for a given document.
 */
var discoverOEmbedURL = function(document) {
    var match;

    // TODO: support xml
    match = document.querySelector('head > link[rel="alternate"][type="application/json+oembed"]');

    if (match) {
        return match.attributes.href.value;
    } else {
        return null;
    }
}

var _getPublishedMetadataImpl = function(document, options, rules, callback) {
    var oembedSubject = document.documentURI;
    var oembedURL;

    if (rules && rules.oembed && rules.oembed.endpoint) {
        oembedURL = rules.oembed.endpoint
    } else {
        oembedURL = discoverOEmbedURL(document);
    }

    if (oembedURL) {
        var req = new XMLHttpRequest();

        req.open('GET', oembedURL, true);
        req.onload = function() {
            var oembed = JSON.parse(req.responseText);
            callback(null, oembed);
        }

        req.onerror = function() {
            callback(new Error('Error getting oEmbed'), null);
        }
        req.send();
    } else {
        // no oembedURL, so return an empty dict
        callback(null, {});
    }
}

/**
 * Fetch externally-published metadata, i.e. oembed
 */
var getPublishedMetadata = function(source, options, rules, callback) {
    var document;

    if (typeof source == 'string') {
        _getDocument(source, function(error, document) {
            if (error) {
                callback(new Error('Could not get metadata for ' + source), null);
            } else {
                _getPublishedMetadataImpl(document, options, rules, callback);
            }
        });
    } else {
        document = source;
        _getPublishedMetadataImpl(document, options, rules, callback);
    }
}

exports.getPublishedMetadata = getPublishedMetadata;

var _getMetadataImpl = function(document, options, callback) {
    var processDOM;
    var fetchPublished;
    var rules = {}; // TODO: uses default rules
    var metadata = new Metadata(document, rules);

    if (options && options.hasOwnProperty('processDOM')) {
        processDOM = options.processDOM;
    } else {
        processDOM = getMetadataFromDOM;
    }

    if (options && options.hasOwnProperty('fetchPublished')) {
        fetchPublished = options.fetchPublished;
    } else {
        fetchPublished = getPublishedMetadata;
    }

    var documentMetadata = processDOM(document, options, rules);
    metadata.rdfa = documentMetadata.rdfa;
    metadata.og = documentMetadata.og;

    if (fetchPublished) {
        fetchPublished(document, options, rules, function(error, publishedMetadata) {
            if (error) {
                callback(error, null);
            } else {
                metadata.oembed = publishedMetadata;
                callback(null, metadata);
            }
        });
    } else {
        callback(null, metadata);
    }
}

/**
 * Get all available metadata for a given source (uri or document)
 * and call callback(error, result) when done.
 *
 * Arguments:
 * source - URI or document
 * options - container for optional override functions for getting published or RDFa metadata
 *   - processDOM: function(uri, options, rules, callback)
 *       Called by getMetadata to fetch metadata from DOM for a given URI.
 *       Default: getMetadataFromDOM().
 *   - fetchPublished: function(uri, options, rules, callback)
 *       Called by getMetadata to fetch published metadata.
 *       Default: getPublishedMetadata().
 *
 */
var getMetadata = function(source, options, callback) {
    var document;

    if (typeof source == 'string') {
        _getDocument(source, function(error, document) {
            if (error) {
                callback(new Error('Could not get metadata for ' + source), null);
            } else {
                _getMetadataImpl(document, options, callback);
            }
        });
    } else {
        document = source;
        _getMetadataImpl(document, options, callback);
    }
}

exports.getMetadata = getMetadata;
