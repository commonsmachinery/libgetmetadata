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

var MappingType = {
    exactMatch: "Exact match"
};
exports.MappingType = MappingType;


function Media(locator, annotations, metadata) {
    this.locator = locator;
    this.annotations = annotations || [];
    this.metadata = metadata;
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


function Annotation(propertyName, value, language, mappingType, sourceFormat) {
    // Based on:
    // http://www.w3.org/2008/WebVideo/Annotations/drafts/API10/PR2/#maobject-interface
    // but doesn't include fragmentIdentifier, statusCode
    this.propertyName = propertyName;
    this.value = value;

    language && (this.language = language);
    mappingType && (this.mappingType = mappingType);
    sourceFormat && (this.sourceFormat = sourceFormat);
}
exports.Annotation = Annotation;


// annotation types

// identifer
function Identifier(identifierLink, mappingType, sourceFormat) {
    identifierLink && (this.identifierLink = identifierLink);
    Annotation.call(this, "identifier", identifierLink, null, mappingType, sourceFormat);
}
Identifier.prototype = Object.create(Annotation.prototype);
exports.Identifier = Identifier;

// title
function Title(titleLabel, typeLink, typeLabel, mappingType, sourceFormat) {
    titleLabel && (this.titleLabel = titleLabel);
    typeLink && (this.typeLink = typeLink);
    typeLabel && (this.typeLabel = typeLabel);
    Annotation.call(this, "title", titleLabel, null, mappingType, sourceFormat);
}
Title.prototype = Object.create(Annotation.prototype);
exports.Title = Title;

// locator
function Locator(locatorLink, mappingType, sourceFormat) {
    locatorLink && (this.locatorLink = locatorLink);
    Annotation.call(this, "locator", locatorLink, null, mappingType, sourceFormat);
}
Locator.prototype = Object.create(Annotation.prototype);
exports.Locator = Locator;

// creator
function Creator(creatorLink, creatorLabel, roleLink, roleLabel, mappingType, sourceFormat) {
    creatorLink && (this.creatorLink = creatorLink);
    creatorLabel && (this.creatorLabel = creatorLabel);
    roleLink && (this.roleLink = roleLink);
    roleLabel && (this.roleLabel = roleLabel);
    Annotation.call(this, "creator", creatorLabel, null, mappingType, sourceFormat);
}
Creator.prototype = Object.create(Annotation.prototype);
exports.Creator = Creator;

// copyright
function Copyright(copyrightLabel, holderLabel, holderLink, mappingType, sourceFormat) {
    copyrightLabel && (this.copyrightLabel = copyrightLabel);
    holderLabel && (this.holderLabel = holderLabel);
    holderLink && (this.holderLink = holderLink);
    Annotation.call(this, "copyright", copyrightLabel, null, mappingType, sourceFormat);
}
Copyright.prototype = Object.create(Annotation.prototype);
exports.Copyright = Copyright;

// policy
function Policy(statementLabel, statementLink, typeLabel, typeLink, mappingType, sourceFormat) {
    statementLabel && (this.statementLabel = statementLabel);
    statementLink && (this.statementLink = statementLink);
    typeLabel && (this.typeLabel = typeLabel);
    typeLink && (this.typeLink = typeLink);
    Annotation.call(this, "policy", statementLabel || statementLink, null, mappingType, sourceFormat);
}
Policy.prototype = Object.create(Annotation.prototype);
exports.Policy = Policy;

// frameSize
function FrameSize(width, height, unit, mappingType, sourceFormat) {
    width && (this.width = width);
    height && (this.height = height);
    height && (this.unit = unit);
    Annotation.call(this, "frameSize", width.toString() + "," + height.toString(), null, mappingType, sourceFormat);
}
FrameSize.prototype = Object.create(Annotation.prototype);
exports.FrameSize = FrameSize;
