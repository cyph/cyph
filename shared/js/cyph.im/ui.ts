import * as Cyph from '../cyph';
import {BetaStates, States, urlSections} from './enums';


/**
 * Controls the entire cyph.im UI.
 */
export class UI extends Cyph.UI.BaseButtonManager {
	/** UI state/view. */
	public state: States			= States.none;

	/** Beta page state/view. */
	public betaState: BetaStates	= BetaStates.none;

	/** Indicates whether this is a co-branded instance of Cyph. */
	public coBranded: boolean		= !!customBuild;

	/** Chat UI. */
	public chat: Cyph.UI.Chat.IChat;

	/** The link connection to join this cyph. */
	public cyphConnection: Cyph.UI.ILinkConnection;

	/** Signup form to be displayed at the end of a cyph. */
	public signupForm: Cyph.UI.ISignupForm;

	private onUrlStateChange (urlState: string) : void {
		if (urlState === urlSections.root) {
			return;
		}

		const urlStateSplit: string[]	= urlState.split('/');

		if (urlStateSplit[0] === urlSections.beta) {
			this.betaState	= BetaStates[urlStateSplit[1]];
			this.changeState(States.beta);
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

	private async startChat (initialCallType?: string) : Promise<void> {
		let baseUrl: string	= Cyph.Env.newCyphBaseUrl;

		if (initialCallType) {
			const urlState: string	= Cyph.UrlState.get(true);
			if (urlState.split('/').slice(-1)[0] === initialCallType) {
				Cyph.UrlState.set(urlState + '/', true, true);
			}

			baseUrl	= initialCallType === urlSections.video ?
				Cyph.Env.cyphVideoBaseUrl :
				Cyph.Env.cyphAudioBaseUrl
			;

			/* If unsupported, warn and then close window */
			if (!Cyph.P2P.P2P.isSupported) {
				this.changeState(States.blank);

				await this.dialogManager.alert({
					content: Cyph.Strings.p2pDisabledLocal,
					ok: Cyph.Strings.ok,
					title: Cyph.Strings.p2pTitle
				});

				self.close();

				return;
			}
		}


		this.chat			= new Cyph.UI.Chat.Chat(
			this.dialogManager,
			this.mobileMenu,
			this.notifier,
			true
		);

		this.cyphConnection	= new Cyph.UI.LinkConnection(
			Cyph.Config.cyphCountdown,
			this.chat,
			this.dialogManager
		);

		this.signupForm		= new Cyph.UI.SignupForm();


		if (initialCallType) {
			this.chat.p2pManager.preemptivelyInitiate();
		}


		this.chat.session.on(Cyph.Session.Events.abort, () => {
			this.changeState(States.chat);
			Cyph.UI.Elements.window().off('beforeunload');
		});

		this.chat.session.on(Cyph.Session.Events.beginChatComplete, () => {
			self.onbeforeunload	= () => Cyph.Strings.disconnectWarning;

			if (initialCallType && this.chat.session.state.isAlice) {
				this.chat.p2pManager.p2p.request(initialCallType);
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
					content: initialCallType === urlSections.video ?
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
	}

	/**
	 * @param dialogManager
	 * @param notifier
	 */
	constructor (
		private dialogManager: Cyph.UI.IDialogManager,
		private notifier: Cyph.UI.INotifier
	) {
		super();

		Cyph.UrlState.onchange(urlState => this.onUrlStateChange(urlState));

		self.onhashchange	= () => location.reload();
		self.onpopstate		= null;


		const urlSection: string	= Cyph.UrlState.getSplit()[0];

		if (urlSection === urlSections.beta) {
			Cyph.UrlState.trigger();
		}
		else {
			this.startChat(
				urlSection === urlSections.video || urlSection === urlSections.audio ?
					urlSection :
					undefined
			);
		}

		(async () => {
			while (this.state === States.none) {
				await Cyph.Util.sleep(100);
			}

			await Cyph.Util.sleep(250);

			Cyph.UI.Elements.html().addClass('load-complete');
		})();


		/* Cyphertext easter egg */
		new self['Konami'](() => Cyph.Util.retryUntilComplete(retry => {
			if (
				this.chat &&
				this.chat.state === Cyph.UI.Chat.States.chat
			) {
				this.chat.cyphertext.show();
			}
			else {
				retry();
			}
		}));
	}
}
