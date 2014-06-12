var assert = require("assert")

var testDataDir = path.normalize(path.join(process.cwd(), 'test', 'testdata'));
var metadata;
var result;

var file2uri = function(filename) {
    if (filename) {
        return "file://" + testDataDir + "/" + filename;
    } else {
        return null;
    }
};

var uri2local = function(uri) {
    return "file://" + testDataDir + "/" + uri.split('/').reverse()[0];
};

var getSubjects = function(graph, subjects) {
    var result = {};
    var subjects = typeof subjects === 'string' ? [subjects] : subjects;

    subjects.map(function(subject) {
        result[subject] = graph[subject];
    });

    return result;
}

var fetchPublishedWrapper = function(filename) {
    return function(uri, options, rules, callback) {
        var oembed = JSON.parse(fs.readFileSync(testDataDir + "/" + uri.split('/').reverse()[0]));
        oembed.url = uri2local(oembed.url);
        callback(null, oembed);
    };
};

var getMetadataWrapper = function(filename, options, rules) {
    return function(done){
        var uri = file2uri(filename);
        libgetmetadata.getMetadata(uri, options, rules, function(error, result) {
            if (error) return done(error);
            metadata = result;
            done();
        });
    };
};


describe('rdfa', function(){
    before(getMetadataWrapper('rdfa.html'));

    it('RDFa with known resource', function(){
        result = JSON.stringify(metadata.graph["http://example.com/bob/photos/sunset.jpg"]);
        expected = JSON.stringify({
            "http://purl.org/dc/terms/title": [
                {
                    "type": "literal",
                    "value": "Beautiful Sunset",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://purl.org/dc/terms/creator": [
                {
                    "type": "literal",
                    "value": "Bob",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ]
        });
        assert.equal(result, expected);
    })
});

describe('oembed', function(){
    before(getMetadataWrapper('oembed.html', {fetchPublished: fetchPublishedWrapper("oembed.json")}));

    it('parser', function(){
        result = JSON.stringify(metadata.oembed);
        expected = JSON.stringify({
            "type": "photo",
            "version": "1.0",
            "title": "Obligatory kitten image",
            "author_name": "Labs@Common Machinery",
            "author_url": "http://labs.commonsmachinery.se/mg/",
            "url": uri2local("http://labs.commonsmachinery.se/mgoblin_media/media_entries/4/obkitten.preview.png"),
            "web_page": "http://labs.commonsmachinery.se/mg/u/petli/m/obligatory-kitten/",
            "license": "CC BY-SA 3.0",
            "license_url": "http://creativecommons.org/licenses/by-sa/3.0/"
        });

        assert.equal(result, expected);
    });
});

describe('rdfa-oembed', function(){
    before(getMetadataWrapper('rdfa+oembed.html', {
        fetchPublished: fetchPublishedWrapper("oembed.json")
    }, {
        source: ['rdfa', 'oembed'],
        oembed: {
            "map": {
                "license_url": {
                    "property": "http://www.w3.org/1999/xhtml/vocab#license",
                    "type": "uri"
                },
                "web_page": {
                    "property": "http://purl.org/dc/elements/1.1/identifier",
                    "type": "uri"
                }
            }
        },
        mainElement: ['img#main'],
        mainSubject: ['document']
    }));

    it('metadata', function(){
        result = metadata.graph[file2uri('obkitten.preview.png')];
        result['obkitten.preview.png'] = result[file2uri('obkitten.preview.png')];
        delete result[file2uri('obkitten.preview.png')];
        result = JSON.stringify(result);
        expected = JSON.stringify({
            "http://purl.org/dc/terms/title": [
                {
                    "type": "literal",
                    "value": "Another title",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://purl.org/dc/terms/creator": [
                {
                    "type": "literal",
                    "value": "Another author",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://purl.org/dc/elements/1.1/title": [
                {
                    "type": "literal",
                    "value": "Obligatory kitten image",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://creativecommons.org/ns#attributionName": [
                {
                    "type": "literal",
                    "value": "Labs@Common Machinery",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://creativecommons.org/ns#attributionURL": [
                {
                    "type": "uri",
                    "value": "http://labs.commonsmachinery.se/mg/"
                }
            ],
            "http://purl.org/dc/elements/1.1/identifier": [
                {
                    "type": "uri",
                    "value": "http://labs.commonsmachinery.se/mg/u/petli/m/obligatory-kitten/"
                }
            ],
            "http://www.w3.org/1999/xhtml/vocab#license": [
                {
                    "type": "uri",
                    "value": "http://creativecommons.org/licenses/by-sa/3.0/"
                }
            ]
        });
        assert.equal(result, expected);
    });
});

describe('main-element-og', function(){
    before(getMetadataWrapper('main-element+og.html', null, {mainElement: ["img.main-photo"], source: ["og"]}));

    it('og-metadata', function(){
        result = JSON.stringify(metadata.graph[file2uri('main-element+og.html')]);
        expected = {
            "http://ogp.me/ns#title": [
                {
                    "type": "literal",
                    "value": "The Trouble with Bob",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://ogp.me/ns#type": [
                {
                    "type": "literal",
                    "value": "text",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://ogp.me/ns#image": [
                {
                    "type": "literal",
                    "value": "http://example.com/alice/bob-ugly.jpg",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ],
            "http://ogp.me/ns#url": [
                {
                    "type": "literal",
                    "value": "http://example.com/another-page",
                    "datatype": "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral"
                }
            ]
        };

        //expected[file2uri('main-element+og.html')] = expected['main-element+og.html'];
        //delete expected['main-element+og.html'];
        expected = JSON.stringify(expected);

        assert.equal(result, expected);
    })
});

describe('main-element', function(){
    before(getMetadataWrapper('main-element+og.html', null, {
        mainElement: ["img.main-photo"],
        source: ["og"]
    }));

    it('main-element', function(){
        result = metadata.mainSubject;
        expected = file2uri('main-element+og.html');

        assert.equal(result, expected);
    })
});

describe('rewrite-main-subject', function(){
    describe('og-url', function(){
        before(getMetadataWrapper('main-element+og.html', null, {
            mainElement: ["img.main-photo"],
            source: ["og"],
            rewriteMainSubject: "og:http://ogp.me/ns#url"
        }));

        it('og-url', function(){
            result = metadata.mainSubject;
            expected = "http://example.com/another-page";

            assert.equal(result, expected);
        })
    });

    describe('xpath', function(){
        before(getMetadataWrapper('main-element+og.html', null, {
            mainElement: ["img.main-photo"],
            source: ["og"],
            rewriteMainSubject: "xpath:/html/head/link[@rel='canonical']/@href"
        }));

        it('xpath', function(){
            result = metadata.mainSubject;
            expected = "http://example.com/another-page2";

            assert.equal(result, expected);
        })
    });

    describe('xpath', function(){
        before(getMetadataWrapper('main-element+og.html', null, {
            mainElement: ["img.main-photo"],
            source: ["og"],
            rewriteMainSubject: "xpath:/html/head/link[@rel='canonical']/@href"
        }));

        it('xpath', function(){
            result = metadata.mainSubject;
            expected = "http://example.com/another-page2";

            assert.equal(result, expected);
        })
    });

    describe('oembed', function(){
        before(getMetadataWrapper('rdfa+oembed.html', {
            fetchPublished: fetchPublishedWrapper("oembed.json")
        }, {
            source: ['rdfa', 'oembed'],
            oembed: {
                "map": {
                    "license_url": {
                        "property": "http://www.w3.org/1999/xhtml/vocab#license",
                        "type": "uri"
                    },
                    "web_page": {
                        "property": "http://purl.org/dc/elements/1.1/identifier",
                        "type": "uri"
                    }
                }
            },
            mainElement: ['img#main'],
            mainSubject: ['document'],
            rewriteMainSubject: ['oembed:web_page']
        }));

        it('oembed', function(){
            result = metadata.mainSubject;
            expected = "http://labs.commonsmachinery.se/mg/u/petli/m/obligatory-kitten/";

            assert.equal(result, expected);
        })
    });

    describe('rdfa', function(){
        before(getMetadataWrapper('rdfa+mainsubject.html', null, {
            source: "rdfa",
            mainElement: "img#main",
            rewriteMainSubject: "rdfa:http://purl.org/dc/terms/InteractiveResource"
        }));

        it('rdfa', function(){
            result = metadata.mainSubject;
            expected = "http://example.com/another-page";

            assert.equal(result, expected);
        })
    });
});
