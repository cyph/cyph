/**
 * Represents an email to be sent via Util.email.
 */
export class Email {
	constructor (
		/** Recipient @cyph.com email address ("@cyph.com" may be omitted). */
		public to: string			= '',

		/** Email subject. */
		public subject: string		= '',

		/** Email body. */
		public message: string		= '',

		/** Sender email address. */
		public fromEmail: string	= '',

		/** Sender name. */
		public fromName: string		= '',

		/** Indicates whether email has been sent. */
		public sent: boolean		= false
	) {}
}
