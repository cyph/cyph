module Cyph {
	export module UI {
		export class SignupForm {
			public state: number	= 0;

			public data	= {
				Comment: <string> '',
				Email: <string> '',
				Language: <string> Env.fullLanguage,
				Name: <string> ''
			};

			public submit () : void {
				if (!this.data.Email) {
					return;
				}

				++this.state;
				this.controller.update();

				if (this.state === 2) {
					setTimeout(() => {
						++this.state;
						this.controller.update();
					}, 1500);
				}

				setTimeout(() => {
					let $input: JQuery	= Elements.signupForm.find('input:visible');

					if ($input.length === 1) {
						$input.focus();
					}
				}, 100);


				Util.retryUntilComplete(retry =>
					Util.request({
						method: 'PUT',
						url: Env.baseUrl + 'betasignups',
						data: this.data,
						error: retry,
						success: (isNew: string) => {
							if (isNew === 'true') {
								Analytics.main.send({
									hitType: 'event',
									eventCategory: 'signup',
									eventAction: 'new',
									eventValue: 1
								});
							}
						}
					})
				);
			}

			public constructor (private controller: IController) {
				setTimeout(() =>
					Elements.signupForm.addClass('visible')
				, 500);
			}
		}
	}
}
