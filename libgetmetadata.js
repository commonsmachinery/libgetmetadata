// -*- coding: utf-8 -*-
// libgetmetadata - Collect metadata for creative works from various sources.
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//          Artem Popov <artfwo@commonsmachinery.se>
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

/* global document */


'use strict';

var _nodejs = (typeof module !== 'undefined' && typeof module.exports !== 'undefined');

if (_nodejs) {
    var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
    var jsdom = require('jsdom');
    var uuid = require('uuid');
}

//
// Parse RDFa out of HTML documents into RDF/JSON, separating the
// pseudo-RDFa OpenGraph statements into a separate graph
//
var RDFaProcessor = require('./RDFaProcessor.js').RDFaProcessor;

function JsonRDFaProcessor() {
    this.rdfa = {};
    this.og = {};
    RDFaProcessor.call(this);
}

JsonRDFaProcessor.prototype = new RDFaProcessor();
JsonRDFaProcessor.prototype.constructor = RDFaProcessor;

JsonRDFaProcessor.prototype.addTriple = function(origin, subject, predicate, object) {
    var graph;
    if (/^http:\/\/ogp.me\//.test(predicate)) {
        graph = this.og;
    } else {
        graph = this.rdfa;
    }

    if (!graph.hasOwnProperty(subject)) {
        graph[subject] = {};
    }

    if (!graph[subject].hasOwnProperty(predicate)) {
        graph[subject][predicate] = [];
    }

    var jsonType = object.type === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object' ? 'uri' : 'literal';
    var jsonObject = {
        type: jsonType,
        value: object.value,
        datatype: jsonType === 'literal' ? object.type : undefined,
        lang: object.language || undefined,
    };

    // do not add if triple is already in the graph
    /*for (var i = 0; i < graph[subject][predicate].length; i++) {
        var o = graph[subject][predicate][i];
        if (o.type == jsonObject.type && o.value == jsonObject.value && o.lang == jsonObject.lang) {
            return;
        }
    }*/

    graph[subject][predicate].push(jsonObject);
};



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

var defaultRules = {
    source: ["rdfa", "og", "oembed"],
};

var addTriple = function(graph, subject, predicate, object) {
    //var object = validateObject(object);

    if (!graph.hasOwnProperty(subject)) {
        graph[subject] = {};
    }

    if (!graph[subject].hasOwnProperty(predicate)) {
        graph[subject][predicate] = [];
    }

    // do not add if triple is already in the graph
    for (var i = 0; i < graph[subject][predicate].length; i++) {
        var o = graph[subject][predicate][i];
        if (o.type === object.type && o.value === object.value && o.lang === object.lang) {
            return;
        }
    }

    graph[subject][predicate].push(object);
};

function Metadata(rdfa, og, oembed, rules, document) {
    this.rdfa = rdfa;
    this.og = og;
    this.oembed = oembed;
    this.rules = rules;
    this.document = document;
    this.mainSubject = undefined;

    this.discoverSubjects();
}

Metadata.prototype.get = function(subject) {
    var rdfa = this.rdfa;
    var og = this.og;
    var oembed = this.oembed;
    var rules = this.rules;

    var result = {};
    var oembedSubject;

    // copy og and rdfa as is
    [rdfa, og].map(function(graph) {
        for (var s in graph) {
            if (graph.hasOwnProperty(s)) {
                for (var p in graph[s]) {
                    if (graph[s].hasOwnProperty(p)) {
                        for (var i = 0; i < graph[s][p].length; i++) {
                            var o = graph[s][p][i];
                            addTriple(result, s, p, o);
                        }
                    }
                }
            }
        }
    });

    // oembed in a graph form to result
    if (oembed) {
        if (oembed.type === 'photo') {
            oembedSubject = oembed.url;
        }

        for (var key in oembed) {
            if (oembed.hasOwnProperty(key)) {
                var propertyName = null;
                var propertyType = null;

                if (oembedPropertyMap[key]) {
                    propertyName = oembedPropertyMap[key].property;
                    propertyType = oembedPropertyMap[key].type;
                }

                if (rules && rules.oembed && rules.oembed.map && rules.oembed.map[key]) {
                    propertyName = rules.oembed.map[key].property;
                    propertyType = rules.oembed.map[key].type;
                }

                var oembedObject = ({
                    type: propertyType,
                    value: oembed[key],
                    datatype: propertyType === 'literal' ? "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral" : undefined
                });

                if (propertyName) {
                    addTriple(result, oembedSubject, propertyName, oembedObject);
                }
            }
        }
    }

    if (subject) {
        var subgraph = {};
        subgraph[subject] = result[subject];
        return subgraph;
    }
    else {
        return result;
    }
};

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
Metadata.prototype.discoverSubjects = function() {
    var subjects = [];
    var document = this.document;

    if (document) {
        // For now, just look at images.  We can't do this much smarter since
        // we must decode img.src URIs to get a uniform encoding of them.
        var elements = document.querySelectorAll('img');

        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];

            var subject = null;
            var main = false;

            if (element.id && this.rdfa.hasOwnProperty(element.id)) {
                subject = document.documentURI + '#' + element.id;
            }

            var src = decodeURIComponent(element.src);
            if (!subject && src && this.rdfa.hasOwnProperty(src)) {
                subject = src;
            }

            if (!subject && this.og[this.document.documentURI] && this.og[this.document.documentURI]["http://ogp.me/ns#image"]) {
                subject = this.og[this.document.documentURI]["http://ogp.me/ns#image"];
                main = true;
            }

            if (!subject) {
                if (this.oembed && this.oembed.url === src) {
                    subject = src;
                    main = true;
                }
            }

            if (subject) {
                subjects.push({
                    element: element,
                    subject: subject,
                    id: uuid.v4(),
                    main: main,
                    //mainElementSelector: null,
                    //overlays: null
                });
            }
        }
        if (subjects.length === 1) {
            this.mainSubject = subjects[0].subject;
        }
    } // if (document)
};

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
        }
        else {
            document = req.responseXML;
        }

        callback(null, document);
    };

    req.onerror = function() {
        callback(new Error('Error opening URI ' + uri), null);
    };

    req.send();
};

/**
 * Get RDFa metadata and oembed endpoint from a document.
 *
 * Returns an object with the following attributes:
 * * rdfa - RDFa metadata as RDF/JSON
 * * og - OpenGraph metadata as RDF/JSON
 * * oembedURL - oembed URL, if discovered
 */
var getMetadataFromDOM = function(document, options, rules, callback) {
    var oembedURL = null;
    var processor = new JsonRDFaProcessor();
    processor.process(document);

    // TODO: support xml
    var oembedLink = document.querySelector('head > link[rel="alternate"][type="application/json+oembed"]');
    if (oembedLink) {
        oembedURL = oembedLink.attributes.href.value;
    }

    callback(null, {
        rdfa: processor.rdfa,
        og: processor.og,
        oembedURL: oembedURL,
    });
};

exports.getMetadataFromDOM = getMetadataFromDOM;

/**
 * Fetch externally-published metadata, i.e. oembed
 * URI is the actual endpoint URL.
 */
var getPublishedMetadata = function(uri, options, rules, callback) {
    var req = new XMLHttpRequest();

    req.open('GET', uri, true);
    req.onload = function() {
        var oembed = JSON.parse(req.responseText);
        callback(null, oembed);
    };

    req.onerror = function() {
        callback(new Error('Error getting oEmbed'), null);
    };
    req.send();
};

exports.getPublishedMetadata = getPublishedMetadata;

var getMetadataImpl = function(document, options, rules, callback) {
    var processDOM;
    var fetchPublished;
    var metadata;

    if (!rules) {
        rules = defaultRules;
    }

    if (options && options.hasOwnProperty('processDOM')) {
        processDOM = options.processDOM;
    }
    else {
        processDOM = getMetadataFromDOM;
    }

    if (options && options.hasOwnProperty('fetchPublished')) {
        fetchPublished = options.fetchPublished;
    }
    else {
        fetchPublished = getPublishedMetadata;
    }

    if (processDOM && document) {
        processDOM(document, options, rules, function(error, documentMetadata) {
            if (error) {
                callback(error, null);
            }
            else {
                if (fetchPublished) {
                    var oembedURL;

                    if (rules.oembed && rules.oembed.endpoint) {
                        oembedURL = rules.oembed.endpoint;
                    }
                    else {
                        oembedURL = documentMetadata.oembedURL;
                    }

                    if (oembedURL) {
                        fetchPublished(oembedURL, options, rules, function(error, publishedMetadata) {
                            if (error) {
                                callback(error, null);
                            }
                            else {
                                // have rdfa, og(?), oembed
                                metadata = new Metadata(
                                    documentMetadata.rdfa,
                                    documentMetadata.og,
                                    publishedMetadata,
                                    rules,
                                    document
                                );

                                //metadata.discoverSubjects(document, metadata, rules);
                                callback(null, metadata);
                            }
                        });
                    }
                    else {
                        // no oembedURL, have rdfa, og(?)
                        metadata = new Metadata(
                            documentMetadata.rdfa,
                            documentMetadata.og,
                            null,
                            rules,
                            document
                        );

                        //metadata.discoverSubjects();
                        callback(null, metadata);
                    }
                }
                else {
                    // no fetchPublished, have rdfa, og(?)
                    metadata = new Metadata(
                        documentMetadata.rdfa,
                        documentMetadata.og,
                        null,
                        rules,
                        document
                    );

                    //metadata.discoverSubjects(metadata, rules);
                    callback(null, metadata);
                }
            }
        });
    }
    else if (fetchPublished) {
        if (rules.oembed && rules.oembed.endpoint) {
            fetchPublished(rules.oembed.endpoint, options, rules, function(error, publishedMetadata) {
                if (error) {
                    callback(error, null);
                }
                else {
                    // have oembed
                    metadata = new Metadata(
                        null,
                        null,
                        publishedMetadata,
                        rules,
                        document
                    );

                    //metadata.discoverSubjects(documentMetadata.document, metadata, rules);
                    callback(null, metadata);
                }
            });
        }
        else {
            callback(new Error('no oembed endpoint in rules'), null);
        }
    }
};

/**
 * Get all available metadata for a given source (uri or document)
 * and call callback(error, result) when done.
 *
 * Arguments:
 * source - URI or document (can be null)
 * options - container for optional override functions for getting published or RDFa metadata
 *   - processDOM: function(uri, options, rules, callback)
 *       Called by getMetadata to fetch metadata from DOM for a given URI.
 *       Default: getMetadataFromDOM().
 *   - fetchPublished: function(uri, options, rules, callback)
 *       Called by getMetadata to fetch published metadata.
 *       Default: getPublishedMetadata().
 * rules - site-specific rules for subject mangling and fetching oEmbed.
 * callback - function(error, metadata) to be called on success or failure.
 */
var getMetadata = function(source, options, rules, callback) {
    if (typeof source === 'string') {
        _getDocument(source, function(error, doc) {
            if (error) {
                callback(error, null);
            }
            else {
                getMetadataImpl(doc, options, rules, callback);
            }
        });
    }
    else {
        getMetadataImpl(document, options, rules, callback);
    }
};

exports.getMetadata = getMetadata;
