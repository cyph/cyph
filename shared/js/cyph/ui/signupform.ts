module Cyph {
	export module UI {
		export class SignupForm implements ISignupForm {
			public state: number	= 0;

			public data	= {
				Comment: <string> '',
				Email: <string> '',
				Language: <string> Env.fullLanguage,
				Name: <string> ''
			};

			public submit () : void {

				this.controller.update();

				setTimeout(() => {
					const $input: JQuery	= Elements.signupForm.find('input:visible');

					if ($input.length === 1) {
						$input.focus();
					}
				}, 100);

			}

			/**
			 * @param controller
			 */
			public constructor (private controller: IController) {
				setTimeout(() =>
					Elements.signupForm.addClass('visible')
				, 500);
			}
		}
	}
}
