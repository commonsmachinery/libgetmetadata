// rdfa-glue.js - use the GreenTurtle RDFa parser with rdflib.js

// Copyright 2013 Commons Machinery http://commonsmachinery.se/
//
// Authors: Peter Liljenberg <peter@commonsmachinery.se>
//
// Distributed under an MIT license, please see LICENSE in the top dir.

var RDFaProcessor = require('./RDFaProcessor.js').RDFaProcessor;

JsonRDFaProcessor.prototype = new RDFaProcessor();
JsonRDFaProcessor.prototype.constructor = RDFaProcessor;

function JsonRDFaProcessor() {
    this.rdfa = {};
    this.og = {};
    RDFaProcessor.call(this);
}

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

    var jsonType = object.type == 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object' ? 'uri' : 'literal'
    var jsonObject = {
        type: jsonType,
        value: object.value,
        datatype: jsonType == 'literal' ? object.type : undefined,
        lang: object.language || undefined,
    }

    // do not add if triple is already in the graph
    /*for (var i = 0; i < graph[subject][predicate].length; i++) {
        var o = graph[subject][predicate][i];
        if (o.type == jsonObject.type && o.value == jsonObject.value && o.lang == jsonObject.lang) {
            return;
        }
    }*/

    graph[subject][predicate].push(jsonObject);
};

exports.JsonRDFaProcessor = JsonRDFaProcessor;
