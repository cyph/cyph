module Cyph.im {
	export module UI {
		export class UI {
			public copyUrl: string			= '';
			public copyUrlEncoded: string	= '';
			public state: States			= States.none;

			public chat: Cyph.UI.Chat.IChat;
			public signupForm: Cyph.UI.ISignupForm;

			public beginWaiting () : void {
				this.changeState(States.waitingForFriend);

				let copyUrl: string	=
					((!Cyph.Env.isOnion && location['origin']) || 'https://www.cyph.im') +
					'/#' +
					this.chat.session.state.cyphId +
					this.chat.session.state.sharedSecret
				;

				this.copyUrlEncoded	= encodeURIComponent(copyUrl);


				let setCopyUrl: Function	= () => {
					if (this.copyUrl !== copyUrl) {
						this.copyUrl	= copyUrl;
						this.controller.update();
					}
				};

				let selectCopyUrl: Function	= () => {
					if ('setSelectionRange' in Cyph.UI.Elements.copyUrlInput[0]) {
						Cyph.UI.Elements.copyUrlInput[0]['setSelectionRange'](
							0,
							copyUrl.length
						);
					}
				};

				if (Cyph.Env.isMobile) {
					setCopyUrl();

					/* Only allow right-clicking (for copying the link) */
					Cyph.UI.Elements.copyUrlLink.click(e =>
						e.preventDefault()
					);
				}
				else {
					let copyUrlInterval	= setInterval(() => {
						if (this.state === States.waitingForFriend) {
							setCopyUrl();
							Cyph.UI.Elements.copyUrlInput.focus();
							selectCopyUrl();
						}
						else {
							clearInterval(copyUrlInterval);
						}
					}, 250);
				}

				if (Cyph.Env.isIE) {
					let expireTime: string	= new Date(Date.now() + 600000)
						.toLocaleTimeString()
						.toLowerCase()
						.replace(/(.*:.*):.*? /, '$1')
					;

					Cyph.UI.Elements.timer.parent().text('Link expires at ' + expireTime);
					Cyph.UI.Elements.timer	= null;
				}
				else {
					Cyph.UI.Elements.timer[0]['start']();
				}
			}

			public changeState (state: States) : void {
				this.state	= state;
				this.controller.update();
			}

			public openMobileMenu () : void {
				setTimeout(() => {
					this.mobileMenu.open();
				}, 250);
			}

			public constructor (
				private controller: Cyph.IController,
				private dialogManager: Cyph.UI.IDialogManager,
				private mobileMenu: Cyph.UI.ISidebar,
				private notifier: Cyph.UI.INotifier
			) {
				if (
					WebSign &&
					WebSign.detectChange() &&
					!Config.webSignHashes[localStorage.webSignBootHash]
				) {
					this.changeState(States.webSignObsolete);
					Cyph.Errors.logWebSign();
				}
				else {
					Cyph.UrlState.onchange(() : void => {
						let urlState: string	= Cyph.UrlState.get();

						if (urlState === Cyph.UrlState.states.notFound) {
							this.changeState(States.error);
						}
						else {
							Cyph.UrlState.set(Cyph.UrlState.states.notFound);
							return;
						}

						Cyph.UrlState.set(urlState, true, true);
					});

					this.chat		= new Cyph.UI.Chat.Chat(
						this.controller,
						this.dialogManager,
						this.mobileMenu,
						this.notifier
					);

					this.signupForm	= new Cyph.UI.SignupForm(this.controller);



					this.chat.session.on(Cyph.Session.Events.abort, () => {
						this.changeState(States.chat);
						Cyph.UI.Elements.window.off('beforeunload');
					});

					this.chat.session.on(Cyph.Session.Events.beginChatComplete, () =>
						Cyph.UI.Elements.window.
							unload(() => this.chat.session.close(true)).
							on('beforeunload', () => Cyph.Strings.disconnectWarning)
					);

					this.chat.session.on(Cyph.Session.Events.beginWaiting, () => this.beginWaiting());

					this.chat.session.on(Cyph.Session.Events.connect, () => this.changeState(States.chat));

					this.chat.session.on(Cyph.Session.Events.newCyph, () => this.changeState(States.spinningUp));
				}


				Cyph.UrlState.set(location.pathname, false, true);
				self.onhashchange	= () => location.reload();


				if (!Cyph.Env.isMobile && Cyph.Env.isIE) {
					this.dialogManager.alert({
						title: Cyph.Strings.warningTitle,
						ok: Cyph.Strings.ok,
						content: Cyph.Strings.IEWarning
					});
				}
			}
		}
	}
}
