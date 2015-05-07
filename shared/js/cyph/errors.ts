module Cyph {
	/**
	 * Handles errors.
	 */
	export class Errors {
		private static baseErrorLog (subject: string, shouldIncludeBootstrapText?: boolean) : Function {
			let numEmails: number	= 0;

			return (
				errorMessage?: string,
				url?: string,
				line?: number,
				column?: number,
				errorObject?: any
			) : void => {
				let exception: string	= !errorMessage ? '' : (
					errorMessage + '\n\n' +
					'URL: ' + url + '\n' +
					'Line: ' + line + '\n' +
					'Column: ' + column + '\n\n' +
					(errorObject && errorObject.stack)
				);

				let message: string		= exception +
					'\n\n' + Env.userAgent +
					'\n\n' + Env.language +
					'\n\n' + (location ? location.toString() : '') +
					'\n\n' + (WebSign ? WebSign.toString(shouldIncludeBootstrapText) : '')
				;

				/* Strip URL fragment where applicable */
				exception	= exception.replace(/#.*/g, '');
				message		= message.replace(/#.*/g, '');

				if (numEmails++ < 50) {
					Util.request({
						method: 'POST',
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

				Analytics.main.send('exception', {
					exDescription: exception
				});
			};
		}

		/**
		 * Logs generic error (used by self.onerror).
		 * @param errorMessage
		 * @param url
		 * @param line
		 * @param column
		 * @param errorObject
		 * @function
		 */
		public static log			= Errors.baseErrorLog('WARNING WARNING WARNING SOMETHING IS SRSLY FUCKED UP LADS');

		/**
		 * Logs chat authentication failure (this happens occasionally, not sure why).
		 * @function
		 */
		public static logSmp		= Errors.baseErrorLog('SMP JUST FAILED FOR SOMEONE LADS');

		/**
		 * Logs WebSign failure (this one is super serious and should never happen).
		 * @function
		 */
		public static logWebSign	= Errors.baseErrorLog('SOMEONE JUST GOT THE WEBSIGN ERROR SCREEN LADS', true);

		private static _	= (() => {
			self.onerror	= <ErrorEventHandler> Errors.log;
		})();
	}
}
