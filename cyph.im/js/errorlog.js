/* Log all JS exceptions */
window.onerror = function () {
	$.post('https://api.cyph.com/errors', {
		error: JSON.stringify(arguments) +
			'\n\n' + navigator.userAgent +
			'\n\n' + navigator.language +
			'\n\n' + language +
			'\n\n' + document.location.toString()
	});
}
