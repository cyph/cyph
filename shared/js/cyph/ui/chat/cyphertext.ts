import {analytics} from '../../analytics';
import {events} from '../../session/enums';
import {ISession} from '../../session/isession';
import {strings} from '../../strings';
import {util} from '../../util';
import {BaseButtonManager} from '../basebuttonmanager';
import {elements as cyphElements} from '../elements';
import {IDialogManager} from '../idialogmanager';
import {ISidebar} from '../isidebar';
import {ICyphertext} from './icyphertext';
import {IElements} from './ielements';


/** @inheritDoc */
export class Cyphertext extends BaseButtonManager implements ICyphertext {
	/** @ignore */
	private static readonly curtainClass: string	= 'curtain';


	/** @ignore */
	private showLock: boolean	= false;

	/** @inheritDoc */
	public readonly messages: {author: string; text: string}[]	= [];

	/** @inheritDoc */
	public hide () : void {
		if ($('.' + Cyphertext.curtainClass).length > 0) {
			this.elements.everything().removeClass(Cyphertext.curtainClass);

			(async () => {
				await util.sleep(2000);

				this.dialogManager.toast({
					content: strings.cypherToast3,
					delay: 1000
				});

				await util.sleep(2000);

				/* Workaround for Angular Material bug */
				$('md-toast:visible').remove();
				this.showLock	= false;
			})();
		}
	}

	/** @inheritDoc */
	public log (text: string, author: string) : void {
		if (text) {
			/* Performance optimisation */
			if (this.messages.length > (this.isMobile ? 5 : 50)) {
				this.messages.shift();
			}

			this.messages.push({author, text});
		}
	}

	/** @inheritDoc */
	public show () : void {
		this.baseButtonClick(async () => {
			if (!this.showLock) {
				this.showLock	= true;

				await this.dialogManager.toast({
					content: strings.cypherToast1,
					delay: 2000
				});

				await this.dialogManager.toast({
					content: strings.cypherToast2,
					delay: 3000
				});

				this.elements.everything().addClass(Cyphertext.curtainClass);

				analytics.send({
					eventAction: 'show',
					eventCategory: 'cyphertext',
					eventValue: 1,
					hitType: 'event'
				});
			}
		});
	}

	constructor (
		session: ISession,

		mobileMenu: () => ISidebar,

		/** @ignore */
		private readonly dialogManager: IDialogManager,

		/** @ignore */
		private readonly isMobile: boolean,

		/** @ignore */
		private readonly elements: IElements
	) {
		super(mobileMenu);

		/* Close cyphertext on esc */
		cyphElements.window().keyup(e => {
			if (e.keyCode === 27) {
				this.hide();
			}
		});

		session.on(events.cyphertext, (o: {cyphertext: string; author: string}) =>
			this.log(o.cyphertext, o.author)
		);
	}
}
