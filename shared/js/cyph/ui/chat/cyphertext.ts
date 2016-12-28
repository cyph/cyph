import {analytics} from '../../analytics';
import {events} from '../../session/enums';
import {ISession} from '../../session/isession';
import {strings} from '../../strings';
import {util} from '../../util';
import {DialogManager} from '../dialog-manager';
import {elements as cyphElements} from '../elements';
import {IChatMessage} from './ichat-message';
import {IElements} from './ielements';


/**
 * Represents cyphertext chat UI component.
 */
export class Cyphertext {
	/** @ignore */
	private static readonly curtainClass: string	= 'curtain';


	/** Cyphertext message list. */
	public readonly messages: IChatMessage[]	= [];

	/**
	 * Hides cyphertext UI.
	 */
	public hide () : void {
		if ($('.' + Cyphertext.curtainClass).length > 0) {
			this.elements.everything().removeClass(Cyphertext.curtainClass);

			this.dialogManager.toast({
				content: strings.cypherToast3,
				delay: 1000
			});
		}
	}

	/**
	 * Logs new cyphertext message.
	 * @param text
	 * @param author
	 */
	public log (text: string, author: string) : void {
		if (text) {
			/* Performance optimisation */
			if (this.messages.length > (this.isMobile ? 5 : 50)) {
				this.messages.shift();
			}

			const timestamp	= util.timestamp();

			this.messages.push({
				author,
				text,
				timestamp,
				timeString: util.getTimeString(timestamp),
				unread: false
			});
		}
	}

	/**
	 * Shows cyphertext UI.
	 */
	public async show () : Promise<void> {
		await this.dialogManager.toast({
			content: strings.cypherToast1,
			delay: 2000
		});

		await this.dialogManager.toast({
			content: strings.cypherToast2,
			delay: 3000
		});

		this.elements.everything().addClass(Cyphertext.curtainClass);

		analytics.sendEvent({
			eventAction: 'show',
			eventCategory: 'cyphertext',
			eventValue: 1,
			hitType: 'event'
		});
	}

	constructor (
		session: ISession,

		/** @ignore */
		private readonly dialogManager: DialogManager,

		/** @ignore */
		private readonly isMobile: boolean,

		/** @ignore */
		private readonly elements: IElements
	) {
		/* Close cyphertext on esc */
		cyphElements.window().keyup(e => {
			if (e.keyCode === 27) {
				this.hide();
			}
		});

		session.on(events.cyphertext, (o: {cyphertext: string; author: string}) => {
			this.log(o.cyphertext, o.author);
		});
	}
}
