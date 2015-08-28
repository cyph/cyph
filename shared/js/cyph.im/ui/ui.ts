module Cyph.im {
	export module UI {
		/**
		 * Controls the entire cyph.im UI.
		 */
		export class UI extends Cyph.UI.BaseButtonManager {
			/** UI state/view. */
			public state: States	= States.none;

			/** Chat UI. */
			public chat: Cyph.UI.Chat.IChat;

			/** The link connection to join this cyph. */
			public cyphConnection: Cyph.UI.ILinkConnection;

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
				this.cyphConnection.beginWaiting(
					Cyph.Env.newCyphBaseUrl,
					this.chat.session.state.sharedSecret,
					this.chat.session.state.wasInitiatedByAPI
				);

				this.changeState(States.waitingForFriend);
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
			 * @param controller
			 * @param dialogManager
			 * @param mobileMenu
			 * @param notifier
			 */
			public constructor (
				controller: Cyph.IController,
				private dialogManager: Cyph.UI.IDialogManager,
				mobileMenu: Cyph.UI.ISidebar,
				private notifier: Cyph.UI.INotifier
			) {
				super(controller, mobileMenu);

				this.chat			= new Cyph.UI.Chat.Chat(
					this.controller,
					this.dialogManager,
					this.mobileMenu,
					this.notifier
				);

				this.cyphConnection	= new Cyph.UI.LinkConnection(
					Config.newCyphCountdown,
					this.controller,
					() => this.chat.abortSetup()
				);

				this.signupForm		= new Cyph.UI.SignupForm(this.controller);



				Cyph.UrlState.onchange(urlState => this.onUrlStateChange(urlState));

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

				this.chat.session.on(Cyph.Session.Events.connect, () => {
					this.changeState(States.chat);
					
					if (this.cyphConnection) {
						this.cyphConnection.stop();
					}
				});

				this.chat.session.on(Cyph.Session.Events.newCyph, () =>
					this.changeState(States.spinningUp)
				);


				Cyph.UrlState.set(locationData.pathname, false, true);
				self.onhashchange	= () => location.reload();
				self.onpopstate		= null;


				if (!Cyph.Env.isMobile && Cyph.Env.isIEOrEdge) {
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
