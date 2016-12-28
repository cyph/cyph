import {env} from '../cyph/env';
import {P2P} from '../cyph/p2p/p2p';
import {events} from '../cyph/session/enums';
import {strings} from '../cyph/strings';
import * as Chat from '../cyph/ui/chat';
import {DialogManager} from '../cyph/ui/dialog-manager';
import {elements} from '../cyph/ui/elements';
import {Notifier} from '../cyph/ui/notifier';
import {SignupForm} from '../cyph/ui/signup-form';
import {urlState} from '../cyph/url-state';
import {util} from '../cyph/util';
import {BetaStates, States, urlSections} from './enums';


/**
 * Controls the entire cyph.im UI.
 */
export class UI {
	/** Initialisation event. */
	public static readonly uiInitEvent: string	= 'uiInitEvent';


	/** @see States */
	public state: States			= States.none;

	/** @see BetaStates */
	public betaState: BetaStates	= BetaStates.none;

	/** @see Chat.IChat */
	public chat: Chat.Chat;

	/** @see LinkConnection.baseUrl */
	public linkConnectionBaseUrl: string;

	/** Signup form to be displayed at the end of a cyph. */
	public signupForm: SignupForm;

	/** @ignore */
	private onUrlStateChange (newUrlState: string) : void {
		if (newUrlState === urlSections.root) {
			return;
		}

		const newUrlStateSplit: string[]	= newUrlState.split('/');

		if (newUrlStateSplit[0] === urlSections.beta) {
			this.betaState	= (<any> BetaStates)[newUrlStateSplit[1]];
			this.state		= States.beta;
		}
		else if (newUrlState === urlState.states.notFound) {
			this.state		= States.error;
		}
		else {
			urlState.setUrl(urlState.states.notFound);
			return;
		}

		urlState.setUrl(newUrlState, true, true);
	}

	/** @ignore */
	private async startChat (initialCallType?: string) : Promise<void> {
		let baseUrl: string	= env.newCyphBaseUrl;

		if (initialCallType) {
			const newUrlState: string	= urlState.getUrl(true);
			if (newUrlState.split('/').slice(-1)[0] === initialCallType) {
				urlState.setUrl(newUrlState + '/', true, true);
			}

			baseUrl	= initialCallType === urlSections.video ?
				env.cyphVideoBaseUrl :
				env.cyphAudioBaseUrl
			;

			/* If unsupported, warn and then close window */
			if (!P2P.isSupported) {
				this.state	= States.blank;

				await this.dialogManager.alert({
					content: strings.p2pDisabledLocal,
					ok: strings.ok,
					title: strings.p2pTitle
				});

				self.close();

				return;
			}
		}


		this.chat			= new Chat.Chat(
			this.dialogManager,
			this.notifier,
			true
		);

		this.signupForm		= new SignupForm();


		if (initialCallType) {
			this.chat.p2pManager.preemptivelyInitiate();
		}


		this.chat.session.one(events.abort).then(() => {
			self.onbeforeunload	= () => {};
			this.state			= States.chat;
		});

		this.chat.session.one(events.beginChatComplete).then(() => {
			self.onbeforeunload	= () => strings.disconnectWarning;

			if (initialCallType && this.chat.session.state.isAlice) {
				this.chat.p2pManager.p2p.request(initialCallType);
			}
		});

		this.chat.session.one(events.beginWaiting).then(() => {
			this.linkConnectionBaseUrl	= baseUrl;
			this.state					= States.waitingForFriend;
		});

		this.chat.session.one(events.connect).then(() => {
			this.state	= States.chat;

			if (initialCallType) {
				this.dialogManager.toast({
					content: initialCallType === urlSections.video ?
						strings.p2pWarningVideoPassive :
						strings.p2pWarningAudioPassive
					,
					delay: 5000
				});
			}
		});
	}

	constructor (
		/** @see DialogManager */
		public readonly dialogManager: DialogManager,

		/** @ignore */
		private readonly notifier: Notifier
	) {
		urlState.onChange(newUrlState => { this.onUrlStateChange(newUrlState); });

		self.onhashchange	= () => { location.reload(); };
		self.onpopstate		= () => {};


		const urlSection: string	= urlState.getUrlSplit()[0];

		if (urlSection === urlSections.beta) {
			urlState.trigger();
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
				await util.sleep();
			}

			await util.sleep();

			elements.html().addClass('load-complete');
		})();


		/* Cyphertext easter egg */
		/* tslint:disable-next-line:no-unused-new */
		new (<any> self).Konami(async () => {
			while (!this.chat || this.chat.state !== Chat.States.chat) {
				await util.sleep();
			}

			this.chat.cyphertext.show();
		});
	}
}
