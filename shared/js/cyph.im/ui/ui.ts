module Cyph.im {
	export module UI {
		/**
		 * Controls the entire cyph.im UI.
		 */
		export class UI {
			/** The link to join this cyph. */
			public copyUrl: string			= '';

			/** URL-encoded version of this.copyUrl (for sms and mailto links). */
			public copyUrlEncoded: string	= '';

			/** UI state/view. */
			public state: States			= States.none;

			/** Chat UI. */
			public chat: Cyph.UI.Chat.IChat;

			/** Signup form to be displayed at the end of a cyph. */
			public signupForm: Cyph.UI.ISignupForm;

			private onUrlStateChange (urlState: string) : void {
				if (urlState === Cyph.UrlState.states.notFound) {
					this.changeState(States.error);
				}
				else {
					Cyph.UrlState.set(Cyph.UrlState.states.notFound);
					return;
				}

				Cyph.UrlState.set(urlState, true, true);
			}

			/**
			 * Initiates UI for sending cyph link to friend.
			 */
			public beginWaiting () : void {
				this.changeState(States.waitingForFriend);

				const copyUrl: string	=
					Env.newCyphUrl +
					'#' +
					this.chat.session.state.cyphId +
					this.chat.session.state.sharedSecret
				;

				this.copyUrlEncoded	= encodeURIComponent(copyUrl);


				const setCopyUrl: Function	= () => {
					if (this.copyUrl !== copyUrl) {
						this.copyUrl	= copyUrl;
						this.controller.update();
					}
				};

				const selectCopyUrl: Function	= () =>
					Util.getValue(
						Cyph.UI.Elements.copyUrlInput[0],
						'setSelectionRange',
						() => {}
					).call(
						Cyph.UI.Elements.copyUrlInput[0],
						0,
						copyUrl.length
					);
				;

				if (Cyph.Env.isMobile) {
					setCopyUrl();

					/* Only allow right-clicking (for copying the link) */
					Cyph.UI.Elements.copyUrlLink.click(e =>
						e.preventDefault()
					);
				}
				else {
					const copyUrlInterval	= setInterval(() => {
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
					const expireTime: string	= new Date(Date.now() + 600000)
						.toLocaleTimeString()
						.toLowerCase()
						.replace(/(.*:.*):.*? /, '$1')
					;

					Cyph.UI.Elements.timer.parent().text(
						Cyph.Strings.linkExpiresAt +
						' ' +
						expireTime
					);
				}
				else {
					Cyph.UI.Elements.timer[0]['start']();
				}
			}

			/**
			 * Changes UI state.
			 * @param state
			 */
			public changeState (state: States) : void {
				this.state	= state;
				this.controller.update();
			}

			/**
			 * Opens mobile sidenav menu.
			 */
			public openMobileMenu () : void {
				setTimeout(() =>
					this.mobileMenu.open()
				, 250);
			}

			/**
			 * @param controller
			 * @param dialogManager
			 * @param mobileMenu
			 * @param notifier
			 */
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
					Cyph.Errors.logWebSign();
					this.changeState(States.webSignChanged);
				}
				else {
					Cyph.UrlState.onchange(urlState => this.onUrlStateChange(urlState));

					this.chat	= new Cyph.UI.Chat.Chat(
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

					this.chat.session.on(Cyph.Session.Events.beginWaiting, () =>
						this.beginWaiting()
					);

					this.chat.session.on(Cyph.Session.Events.connect, () =>
						this.changeState(States.chat)
					);

					this.chat.session.on(Cyph.Session.Events.newCyph, () =>
						this.changeState(States.spinningUp)
					);
				}


				Cyph.UrlState.set(location.pathname, false, true);
				self.onhashchange	= () => location.reload();
				self.onpopstate		= null;


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
