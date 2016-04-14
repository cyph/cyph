import {ProStates, States, UrlSections} from 'enums';


/**
 * Controls the entire cyph.im UI.
 */
export class UI extends Cyph.UI.BaseButtonManager {
	/** UI state/view. */
	public state: States			= States.none;

	/** Pro page state/view. */
	public proState: ProStates		= ProStates.none;

	/** Chat UI. */
	public chat: Cyph.UI.Chat.IChat;

	/** The link connection to join this cyph. */
	public cyphConnection: Cyph.UI.ILinkConnection;

	/** Signup form to be displayed at the end of a cyph. */
	public signupForm: Cyph.UI.ISignupForm;

	private onUrlStateChange (urlState: string) : void {
		if (urlState === UrlSections.root) {
			return;
		}

		const urlStateSplit: string[]	= urlState.split('/');

		if (urlStateSplit[0] === UrlSections.pro) {
			this.proState	= ProStates[urlStateSplit[1]];
			this.changeState(States.pro);
		}
		else if (urlState === Cyph.UrlState.states.notFound) {
			this.changeState(States.error);
		}
		else {
			Cyph.UrlState.set(Cyph.UrlState.states.notFound);
			return;
		}

		Cyph.UrlState.set(urlState, true, true);
	}

	private startChat (initialCallType?: string) : void {
		let baseUrl: string	= Cyph.Env.newCyphBaseUrl;

		if (initialCallType) {
			const urlState: string	= UrlState.get(true);
			if (urlState.split('/').slice(-1)[0] === initialCallType) {
				UrlState.set(urlState + '/', true, true);
			}

			baseUrl	= initialCallType === UrlSections.video ?
				Cyph.Env.cyphVideoBaseUrl :
				Cyph.Env.cyphAudioBaseUrl
			;

			if (!Cyph.WebRTC.isSupported) {
				/* If unsupported, warn and then close window */

				this.dialogManager.alert({
					title: Cyph.Strings.p2pTitle,
					content: Cyph.Strings.p2pDisabledLocal,
					ok: Cyph.Strings.ok
				}, ok =>
					self.close()
				);

				this.changeState(States.blank);

				return;
			}
		}


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


		if (initialCallType) {
			this.chat.p2pManager.preemptivelyInitiate();
		}


		this.chat.session.on(Cyph.Session.Events.abort, () => {
			this.changeState(States.chat);
			Cyph.UI.Elements.window.off('beforeunload');
		});

		this.chat.session.on(Cyph.Session.Events.beginChatComplete, () => {
			Cyph.UI.Elements.window.
				unload(() => this.chat.session.close(true)).
				on('beforeunload', () => Cyph.Strings.disconnectWarning)
			;

			if (initialCallType && this.chat.session.state.isCreator) {
				this.chat.p2pManager.p2p.requestCall(initialCallType);
			}
		});

		this.chat.session.on(Cyph.Session.Events.beginWaiting, () =>
			this.beginWaiting(baseUrl)
		);

		this.chat.session.on(Cyph.Session.Events.connect, () => {
			this.changeState(States.chat);

			if (this.cyphConnection) {
				this.cyphConnection.stop();
			}

			if (initialCallType) {
				this.dialogManager.toast({
					content: initialCallType === UrlSections.video ?
						Cyph.Strings.p2pWarningVideoPassive :
						Cyph.Strings.p2pWarningAudioPassive
					,
					delay: 5000
				});
			}
		});

		this.chat.session.on(Cyph.Session.Events.newCyph, () =>
			this.changeState(States.spinningUp)
		);
	}

	/**
	 * Initiates UI for sending cyph link to friend.
	 */
	public beginWaiting (baseUrl: string) : void {
		this.cyphConnection.beginWaiting(
			baseUrl,
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

		Cyph.UrlState.onchange(urlState => this.onUrlStateChange(urlState));

		self.onhashchange	= () => location.reload();
		self.onpopstate		= null;


		const urlSection: string	= UrlState.getSplit()[0];

		if (urlSection === UrlSections.pro) {
			UrlState.trigger();
		}
		else {
			this.startChat(
				urlSection === UrlSections.video || urlSection === UrlSections.audio ?
					urlSection :
					undefined
			);
		}


		if (!Cyph.Env.isMobile && Cyph.Env.isIEOrEdge) {
			this.dialogManager.alert({
				title: Cyph.Strings.warningTitle,
				ok: Cyph.Strings.ok,
				content: Cyph.Strings.IEWarning
			});
		}
	}
}
