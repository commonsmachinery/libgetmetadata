
JSHINT = ./node_modules/.bin/jshint

node-js = libgetmetadata.js

REPORTER=
ifeq ($(EMACS),t)
REPORTER=--reporter=.jshint-emacs.js
endif

all: lint

clean:

lint:
	$(JSHINT) $(REPORTER) $(node-js)

test:
	@./node_modules/.bin/mocha --require test/common test/tests.js

.PHONY: all clean lint test
