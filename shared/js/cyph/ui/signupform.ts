
			let $betaSignupForm		= $('.beta-signup-form');

			this.betaSignupState	= 0;

			this.betaSignup		= {
				Language: language
			};

			public submitBetaSignup () {
				this.controller.update(() => {
					++this.betaSignupState;
				});

				if (this.betaSignupState === 2) {
					setTimeout(() => {
						this.controller.update(() => {
							++this.betaSignupState;
						});
					}, 1500);
				}

				setTimeout(() => {
					/* Temporary workaround */
					let $input	= $betaSignupForm.find('input:visible');
					if ($input.length === 1) {
						$input.focus();
					}
				}, 100);

				let retries	= 0;
				let dothemove: Function	= () {
					Util.request({
						method: 'PUT',
						url: Cyph.Env.baseUrl + 'betasignups',
						data: this.betaSignup,
						error: () => {
							if (++retries < 5) {
								dothemove();
							}
							else {
								retries	= 0;
							}
						},
						success: (isNew) => {
							if (isNew === 'true') {
								Analytics.main.send({
									hitType: 'event',
									eventCategory: 'signup',
									eventAction: 'new',
									eventValue: 1
								});
							}
						}
					});
				};

				dothemove();
			};

			setTimeout(() => {
				$betaSignupForm.addClass('visible');
			}, 500);
