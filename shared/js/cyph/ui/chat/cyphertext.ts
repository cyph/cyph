import {analytics} from '../../analytics';
import {events} from '../../session/enums';
import {ISession} from '../../session/isession';
import {strings} from '../../strings';
import {util} from '../../util';
import {elements as cyphElements} from '../elements';
import {IDialogManager} from '../idialogmanager';
import {IChatMessage} from './ichatmessage';
import {ICyphertext} from './icyphertext';
import {IElements} from './ielements';


/** @inheritDoc */
export class Cyphertext implements ICyphertext {
	/** @ignore */
	private static readonly curtainClass: string	= 'curtain';


	/** @inheritDoc */
	public readonly messages: IChatMessage[]	= [];

	/** @inheritDoc */
	public hide () : void {
		if ($('.' + Cyphertext.curtainClass).length > 0) {
			this.elements.everything().removeClass(Cyphertext.curtainClass);

			this.dialogManager.toast({
				content: strings.cypherToast3,
				delay: 1000
			});
		}
	}

	/** @inheritDoc */
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

	/** @inheritDoc */
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
		private readonly dialogManager: IDialogManager,

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
