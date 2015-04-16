
			public cyphertext: string[]		= [];

			public log (text, author) {
				if (text) {
					this.controller.update(() => {
						if (Cyph.Env.isMobile && this.cyphertext.length > 5) {
							this.cyphertext.shift();
						}

						this.cyphertext.push({author: author, text: JSON.parse(text).message});
					});
				}
			}


			let showCyphertextLock	= false;
			let curtainClass		= 'curtain';
			let cypherToastPosition	= 'top right';

			public hide () {
				if ($('.' + curtainClass).length < 1) {
					return;
				}

				UI.Elements.everything.removeClass(curtainClass);

				setTimeout(() => {
					$mdToast.show({
						template: '<md-toast>' + Strings.cypherToast3 + '</md-toast>',
						hideDelay: 1000,
						position: cypherToastPosition,
						detachSwipe: () => {}
					});

					/* Workaround for Angular Material bug */
					setTimeout(() => {
						$('md-toast:visible').remove();
						showCyphertextLock	= false;
					}, 2000);
				}, 2000);
			}

			/* Close cyphertext on esc */
			$(document).keyup((e) => {
				if (e.keyCode === 27) {
					this.closeCyphertext();
				}
			});

			public show () {
				this.baseButtonClick(() => {
					if (showCyphertextLock) {
						return;
					}

					showCyphertextLock	= true;

					$mdToast.show({
						template: '<md-toast>' + Strings.cypherToast1 + '</md-toast>',
						hideDelay: 2000,
						position: cypherToastPosition,
						detachSwipe: () => {}
					});

					setTimeout(() => {
						$mdToast.show({
							template: '<md-toast>' + Strings.cypherToast2 + '</md-toast>',
							hideDelay: 3000,
							position: cypherToastPosition,
							detachSwipe: () => {}
						});

						setTimeout(() => {
							UI.Elements.everything.addClass(curtainClass);

							Analytics.main.send({
								hitType: 'event',
								eventCategory: 'cyphertext',
								eventAction: 'show',
								eventValue: 1
							});
						}, 3500);
					}, 2500);
				});
			}
