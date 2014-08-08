// libgetmetadata - Collect metadata for creative works from various sources.
//
// Copyright 2014 Commons Machinery http://commonsmachinery.se/
//
// Distributed under an GPLv2 license, please see LICENSE in the top dir.

'use strict';

var request = require('request');
var Promise = require('bluebird');
var util = require('./util.js');
var media = require('./media.js');
var urlParse = require('url').parse;

var endpointURL = 'https://commons.wikimedia.org/w/api.php?';
var xhtml_license = 'http://www.w3.org/1999/xhtml/vocab#license';

function getExtMetadata(endpoint, title) {
    return new Promise(function(resolve, reject) {
        request({
            url: endpoint,
            qs: {
                action: 'query',
                prop: 'imageinfo',
                iiprop: 'extmetadata',
                titles: title,
                format: 'json',
            },
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
            var query = JSON.parse(body).query;
            try {
                if (query && query.pages && Object.keys(query.pages).length == 1) {
                    var extMetadata = query.pages[Object.keys(query.pages)[0]].imageinfo[0].extmetadata;
                    return resolve(extMetadata);
                }
                else {
                    err = new Error("Unable to parse extmetadata response");
                    return reject(err);
                }
            } catch (err) {
                return reject(err);
            }
        });
    });
}

var getMedia = function(url) {
    var urlObj = urlParse(url);
    var urlPath = urlObj.pathname.split('/');
    var title = urlPath[urlPath.length - 1];
    if (title.indexOf('File:') != 0) {
        throw new Error("Unable to extract filename from Wikimedia Commons URL: " + url);
    }

    return getExtMetadata(endpointURL, title)
    .then(function(extMetadata) {
        var license, title, creator, identifier;
        var objects = [];

        if (extMetadata['ObjectName']) {
            title = new media.Title(
                extMetadata['ObjectName'].value,
                null,
                null,
                media.MappingType.exactMatch,
                extMetadata['ObjectName'].source
            );
        }

        if (extMetadata['LicenseUrl']) {
            license = new media.Policy(
                extMetadata['LicenseShortName'].value.trim(),
                extMetadata['LicenseUrl'].value.trim(),
                'license',
                xhtml_license,
                media.MappingType.exactMatch,
                extMetadata['LicenseUrl'].source
            );
        }

        objects = [
            new media.Media(new media.Locator(url, media.MappingType.exactMatch),
                [],
                {mediawikiMetadata: extMetadata}),
        ];

        if (title) {
            objects.forEach(function(item) { item.annotations.push(title); });
        }

        if (license) {
            objects.forEach(function(item) { item.annotations.push(license); });
        }

        return objects;
    });
};

exports.getMedia = getMedia;
