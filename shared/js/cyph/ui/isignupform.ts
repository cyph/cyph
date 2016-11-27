/**
 * Represents a form to register for cyph.me waitlist.
 */
export interface ISignupForm {
	/** Used to track which users signed up through our promo page. */
	promo: string;

	/** Ordinal number indicating which screen of this form is active. */
	readonly state: number;

	/** Signup data entered by user. */
	readonly data: {
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
