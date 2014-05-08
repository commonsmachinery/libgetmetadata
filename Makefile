test: dotest

dotest:
	@./node_modules/.bin/mocha --require test/common test/tests.js

.PHONY: test dotest
