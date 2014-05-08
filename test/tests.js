var assert = require("assert")

var testDataDir = path.normalize(path.join(process.cwd(), 'test', 'testdata'));
var metadata;
var result;

var file2uri = function(filename) {
    return "file://" + testDataDir + "/" + filename;
};

var uri2local = function(uri) {
    return "file://" + testDataDir + "/" + uri.split('/').reverse()[0];
};

var fetchPublishedWrapper = function(filename) {
    return function(document, options, rules, callback) {
        var oembed = JSON.parse(fs.readFileSync(testDataDir + "/" + filename));
        oembed.url = uri2local(oembed.url);
        callback(null, oembed);
    };
};

var getMetadataWrapper = function(filename, options) {
    return function(done){
        var uri = file2uri(filename);
        libgetmetadata.getMetadata(uri, options, function(error, result) {
            if (error) return done(error);
            metadata = result;
            done();
        });
    };
};


describe('rdfa', function(){
    before(getMetadataWrapper('rdfa.html'));

    it('RDFa with known resource', function(){
        result = metadata.getRDFaMetadata("http://example.com/bob/photos/sunset.jpg");
        result = JSON.stringify(result);
        expected = JSON.stringify({
            "http://example.com/bob/photos/sunset.jpg": {
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
            }
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
    })
});
