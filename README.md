libgetmetadata
==============

libgetmetadata aims to simplify extracting metadata about creative works
from webpages and other sources. Only images are supported at the moment.

Supported metadata sources
--------------------------

* RDFa metadata.
* Open Graph.
* oEmbed.

Basic usage
-----------

    var getMetadata = require("./libgetmetadata").getMetadata;
    getMetadata("http://example.com", null, null, callback);
    // or
    getMetadata(document, null, null, callback);

Where callback is a function with the signature `function(error, result)`.
It can be defined as follows:

    function callback(error, metadata) {
        console.log(metadata.graph);
        // or
        console.log(metadata.graph[metadata.mainSubject]);
    }

The primary function exported by libgetmetadata is
`getMetadata(source, options, rules, callback)`, where

* `source` - can be URI or document.
* `options` - can contain custom processor for DOM and method for getting published metadata.
* `rules` - rules for scraping metadata, usually site-specific.
* `callback` - function with signature `function(error, result)` to be called on success or failure.

Site rules
----------

Rules should be an object (typically stored as JSON) for fine-tuning
metadata lookup on specific sites. Meaningful properties are:

- `source`: an array containing any of 'og', 'rdfa', 'oembed'. These sources will be used to build the graph.
- `oembed`: oEmbed fetching rules defined as follows:
    * `type`: "json" or "xml";
    * `endpoint`: base URL for oEmbed endpoint
    * `map`: a dictionary mapping oEmbed properties to values in the form `{property: "...", type: "..."}`, where `property` is the qualified property name property and `type` is either "uri" or "literal".
- `mainElement`: an array of CSS selectors to look for main element.
- `rewriteMainSubject`: array of lookup patterns for main element subject. Required if mainElement is specified and should include one or more of the following strings:
    * "oembed:..." - parameter from oembed data, typically "web_page".
    * "rdfa:..." - use subject from RDFa triples with this predicate.
    * "og:..." - use subject from OpenGraph triples with this predicate.
    * "xpath:..." - use subject found using an XPath expression.

For example:

    {
        "source": ["oembed", "rdfa"],

        "oembed": {
            "type": "json",
            "endpoint": "http://example.com/oembed"
        },

        "mainElement": [
            "img.main"
        ],

        "rewriteMainSubject": [
            "xpath:/html/head/link[@rel='canonical']/@href"
        ]
    }

Using metadata
--------------

The metadata object passed to callback has the following properties:

* `graph`: Complete graph in RDF/JSON form: `{s: p: [o: {...}]}`
* `mainSubject`: Main element subject, if any.
* `properties`: Core properties, see below for details.

Raw metadata can be accessed through properties `rdfa`, `og`, `oembed`.

Core properties
---------------

libgetmetadata does basic mapping of RDF metadata to a set of core properties
defined in [W3C Ontology for Media Resources (OMR)](http://www.w3.org/TR/mediaont-10/).

The core properties are available through `metadata.properties[subject]` and
include:

* title - title of the work.
* identifier - URL pointing to the work web page
* creator - author of the work.
* policy - license URL.

Running tests
-------------

Running the test suite requires Mocha framework. Run it with `make test`.

License
-------

Copyright 2014 Commons Machinery http://commonsmachinery.se/

Distributed under an GPLv2 license, please see LICENSE in the top dir.

Contact: dev@commonsmachinery.se
