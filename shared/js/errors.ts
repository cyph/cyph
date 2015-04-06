/// <reference path="globals.ts" />
/// <reference path="anal.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


class Errors {
	private static baseErrorLog (subject: string, shouldIncludeBootstrapText?: boolean) : Function {
		var numEmails: number	= 0;

		return (errorMessage?: string, url?: string, line?: number, column?: number, errorObject?: any) : void => {
			var exception: string	= !errorMessage ? '' : (
				errorMessage + '\n\n' +
				'URL: ' + url + '\n' +
				'Line: ' + line + '\n' +
				'Column: ' + column + '\n\n' +
				(errorObject && errorObject.stack)
			);

			var message: string		= exception +
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
		};
	}

	public static log			= Errors.baseErrorLog('WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS');
	public static logSmp		= Errors.baseErrorLog('SMP JUST FAILED FOR SOMEONE LADS');
	public static logWebSign	= Errors.baseErrorLog('SOMEONE JUST GOT THE WEBSIGN ERROR SCREEN LADS', true);
}

window.onerror	= <ErrorEventHandler> Errors.log;
