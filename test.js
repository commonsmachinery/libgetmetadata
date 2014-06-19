// -*- coding: utf-8 -*-

'use strict';

var getMetadata = require('./libgetmetadata.js');
var url = 'http://fav.me/d62zgjw';

getMetadata(url).then(function(result) {
    console.log(JSON.stringify(result, null, 2));
}).catch(function(err) {
    console.log(err.stack);
});