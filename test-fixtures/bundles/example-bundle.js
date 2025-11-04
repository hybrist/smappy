// Simple example bundle with common patterns
(function () {
	'use strict';

	// Utility function
	function add(a, b) {
		return a + b;
	}

	// Class declaration
	class Calculator {
		constructor() {
			this.result = 0;
		}

		add(value) {
			this.result = add(this.result, value);
			return this;
		}

		getResult() {
			return this.result;
		}
	}

	// Export for module systems
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = { Calculator, add };
	} else if (typeof define === 'function' && define.amd) {
		define(function () {
			return { Calculator, add };
		});
	} else {
		window.Calculator = Calculator;
		window.add = add;
	}
})();
