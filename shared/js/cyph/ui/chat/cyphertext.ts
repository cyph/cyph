import {ICyphertext} from './icyphertext';
import {IElements} from './ielements';
import {BaseButtonManager} from '../basebuttonmanager';
import {Elements} from '../elements';
import {IDialogManager} from '../idialogmanager';
import {ISidebar} from '../isidebar';
import {Analytics} from '../../analytics';
import {IController} from '../../icontroller';
import {Util} from '../../util';
import {Strings} from '../../strings';
import * as Session from '../../session';


export class Cyphertext extends BaseButtonManager implements ICyphertext {
	private showLock: boolean		= false;
	private curtainClass: string	= 'curtain';

	public messages: { author: Session.Users; text: string; }[]	= [];

	public hide () : void {
		if ($('.' + this.curtainClass).length > 0) {
			this.elements.everything.removeClass(this.curtainClass);

			(async () => {
				await Util.sleep(2000);

				this.dialogManager.toast({
					content: Strings.cypherToast3,
					delay: 1000
				});

				await Util.sleep(2000);

				/* Workaround for Angular Material bug */
				$('md-toast:visible').remove();
				this.showLock	= false;
			})();
		}
	}

	public log (text: string, author: string) : void {
		if (text) {
			/* Performance optimisation */
			if (this.messages.length > (this.isMobile ? 5 : 50)) {
				this.messages.shift();
			}

			this.messages.push({author, text});
			this.controller.update();
		}
	}

	public show () : void {
		this.baseButtonClick(async () => {
			if (!this.showLock) {
				this.showLock	= true;

				await this.dialogManager.toast({
					content: Strings.cypherToast1,
					delay: 2000
				});

				await this.dialogManager.toast({
					content: Strings.cypherToast2,
					delay: 3000
				});

				this.elements.everything.addClass(this.curtainClass);

				Analytics.send({
					hitType: 'event',
					eventCategory: 'cyphertext',
					eventAction: 'show',
					eventValue: 1
				});
			}
		});
	}

	/**
	 * @param session
	 * @param controller
	 * @param mobileMenu
	 * @param dialogManager
	 * @param isMobile
	 */
	public constructor (
		session: Session.ISession,
		controller: IController,
		mobileMenu: () => ISidebar,
		private dialogManager: IDialogManager,
		private isMobile: boolean,
		private elements: IElements
	) {
		super(controller, mobileMenu);

		/* Close cyphertext on esc */
		Elements.window.keyup(e => {
			if (e.keyCode === 27) {
				this.hide();
			}
		});



		session.on(Session.Events.cyphertext,
			(o: { cyphertext: string; author: string; }) =>
				this.log(o.cyphertext, o.author)
		);
	}
}
