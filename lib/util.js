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

var request = require("request");
var jsdom = require('jsdom');
var Promise = require("bluebird");
var RDFaProcessor = require('./RDFaProcessor.js').RDFaProcessor;

function JsonRDFaProcessor() {
    this.graph = {};
    RDFaProcessor.call(this);
}

JsonRDFaProcessor.prototype = new RDFaProcessor();
JsonRDFaProcessor.prototype.constructor = RDFaProcessor;
JsonRDFaProcessor.prototype.addTriple = function(origin, subject, predicate, object) {
    if (!this.graph.hasOwnProperty(subject)) {
        this.graph[subject] = {};
    }

    if (!this.graph[subject].hasOwnProperty(predicate)) {
        this.graph[subject][predicate] = [];
    }

    var jsonType = object.type === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object' ? 'uri' : 'literal';
    var jsonObject = {
        type: jsonType,
        value: object.value,
        datatype: jsonType === 'literal' ? object.type : undefined,
        lang: object.language || undefined,
    };

    this.graph[subject][predicate].push(jsonObject);
};

exports.JsonRDFaProcessor = JsonRDFaProcessor;

function getDocument(url) {
    return new Promise(function(resolve, reject) {
        jsdom.env({
            url: url,
            headers: {
                'User-Agent': 'libgetmetadata'
            },
            done: function(errors, window) {
                if (errors) {
                    return reject(errors);
                }
                // explicitly set documentURI, RDFaProcessor still needs this
                window.document.documentURI = window.location.href;
                resolve(window.document);
            }
        });
    });
}

exports.getDocument = getDocument;

function getOEmbed(endpoint, url) {
    return new Promise(function(resolve, reject) {
        request({
            url: endpoint,
            qs: { url: url },
            headers: { 'User-Agent': 'libgetmetadata' }
        }, function (err, res, body) {
            if (err) {
                return reject(err);
            } else if (res.statusCode !== 200) {
                err = new Error("Unexpected status code: " + res.statusCode);
                err.res = res;
                return reject(err);
            }
            // promisify doesn't seem to work with the config object,
            // so let's use try/catch for now
            try {
                return resolve(JSON.parse(body));
            } catch (err) {
                return reject(err);
            }
        });
    });
}

exports.getOEmbed = getOEmbed;
