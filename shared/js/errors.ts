var errors	= {
	_base: function (subject, shouldIncludeBootstrapText) {
		var numEmails	= 0;

		return function (errorMessage, url, line, column, errorObject) {
			var exception	= !errorMessage ? '' : (
				errorMessage + '\n\n' +
				'URL: ' + url + '\n' +
				'Line: ' + line + '\n' +
				'Column: ' + column + '\n\n' +
				(errorObject && errorObject.stack)
			);

			var message		= exception +
				'\n\n' + navigator.userAgent +
				'\n\n' + navigator.language +
				'\n\n' + (typeof language == 'undefined' ? '' : language) +
				'\n\n' + document.location.toString() +
				'\n\n' + (
					typeof webSign == 'undefined' ?
						'' :
						webSign.toString(shouldIncludeBootstrapText)
				)
			;

			/* Strip URL fragment where applicable */
			exception	= exception.replace(/#.*/g, '');
			message		= message.replace(/#.*/g, '');

			if (numEmails++ < 50) {
				$.ajax({
					type: 'POST',
					url: 'https://mandrillapp.com/api/1.0/messages/send.json',
					data: {
						key: 'HNz4JExN1MtpKz8uP2RD1Q',
						message: {
							from_email: 'test@mandrillapp.com',
							to: [{
								email: 'errors@cyph.com',
								type: 'to'
							}],
							autotext: 'true',
							subject: 'CYPH: ' + subject,
							text: message
						}
					}
				});
			}

			anal.send('exception', {
				exDescription: exception
			});
		}
	},

	log: errors._base('WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS'),
	logSmp: errors._base('SMP JUST FAILED FOR SOMEONE LADS'),
	logWebSign: errors._base('SOMEONE JUST GOT THE WEBSIGN ERROR SCREEN LADS', true)
};

window.onerror	= errors.log;
