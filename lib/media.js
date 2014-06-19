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

function Media(locator, frameSize, annotations) {
    this.locator = locator;
    this.frameSize = frameSize;
    this.annotations = annotations || [];
}

Media.prototype.getMediaProperty = function(propertyName) {
    var annotation;
    for (var i = 0; i < this.annotations.length; i++) {
        annotation = this.annotations[i];
        if (annotation.propertyName === propertyName) {
            return annotation;
        }
    }
    return null;
};

exports.Media = Media;

function Annotation(propertyName, value, language, mappingType) {
    // Based on:
    // http://www.w3.org/2008/WebVideo/Annotations/drafts/API10/PR2/#maobject-interface
    // but doesn't include sourceFormat, fragmentIdentifier, statusCode
    this.propertyName = propertyName;
    this.value = value;
    this.language = language;
    this.mappingType = mappingType;
}
exports.Annotation = Annotation;

// annotation types

// identifer
function Identifier(identifierLink, mappingType) {
    this.identifierLink = identifierLink;
    Annotation.call(this, "identifier", identifierLink, null, mappingType);
}
Identifier.prototype = new Annotation();
exports.Identifier = Identifier;

// title
function Title(titleLabel, typeLink, typeLabel, mappingType) {
    this.titleLabel = titleLabel;
    this.typeLink = typeLink;
    this.typeLabel = typeLabel;
    Annotation.call(this, "title", titleLabel, null, mappingType);
}
Title.prototype = new Annotation();
exports.Title = Title;

// locator
function Locator(locatorLink, mappingType) {
    this.locatorLink = locatorLink;
    Annotation.call(this, "locator", locatorLink, null, mappingType);
}
Locator.prototype = new Annotation();
exports.Locator = Locator;

// creator
function Creator(creatorLink, creatorLabel, roleLink, roleLabel, mappingType) {
    this.creatorLink = creatorLink;
    this.creatorLabel = creatorLabel;
    this.roleLink = roleLink;
    this.roleLabel = roleLabel;
    Annotation.call(this, "creator", creatorLabel, null, mappingType);
}
Creator.prototype = new Annotation();
exports.Creator = Creator;

// policy
function Policy(statementLabel, statementLink, typeLabel, typeLink, mappingType) {
    this.statementLabel = statementLabel;
    this.statementLink = statementLink;
    this.typeLabel = typeLabel;
    this.typeLink = typeLink;
    Annotation.call(this, "policy", statementLabel || statementLink, null, mappingType);
}
Policy.prototype = new Annotation();
exports.Policy = Policy;

// frameSize
function FrameSize(width, height, unit, mappingType) {
    this.width = width;
    this.height = height;
    this.unit = unit;
    Annotation.call(this, "frameSize", width.toString() + "," + height.toString(), null, mappingType);
}
FrameSize.prototype = new Annotation();
exports.FrameSize = FrameSize;
