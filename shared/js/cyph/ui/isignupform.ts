module Cyph {
	export module UI {
		/**
		 * Represents a form to register for cyph.me waitlist.
		 * @interface
		 */
		export interface ISignupForm {
			/** Ordinal number indicating which screen of this form is active. */
			state: number;

			/** Signup data entered by user. */
			data: {
				Comment: string;
				Email: string;
				Language: string;
				Name: string;
			};

			/**
			 * Submits signup data to server.
			 */
			submit () : void;
		}
	}
}
