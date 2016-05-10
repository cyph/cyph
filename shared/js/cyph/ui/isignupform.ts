/**
 * Represents a form to register for cyph.me waitlist.
 * @interface
 */
export interface ISignupForm {
	/** Ordinal number indicating which screen of this form is active. */
	state: number;

	/** Signup data entered by user. */
	data: {
		Name: string;
		Email: string;
		List: string;

	};

	/**
	 * Submits signup data to server.
	 */
	submit () : void;
}
