/* Log all JS exceptions */
window.onerror = function () {
	$.post('https://api.cyph.com/errors', {error: JSON.stringify(arguments)});
}
