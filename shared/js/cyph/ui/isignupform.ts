/**
 * Represents a form to register for cyph.me waitlist.
 * @interface
 */
export interface ISignupForm {
	/** Used to track which users signed up through our promo page. */
	promo: string;

	/** Ordinal number indicating which screen of this form is active. */
	state: number;

	/** Signup data entered by user. */
	data: {
		email: string;
		inviteCode: string;
		language: string;
		name: string;
	};

	/**
	 * Submits signup data to server.
	 */
	submit () : void;
}
