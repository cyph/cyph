import {Util} from '../../util';
import {Elements} from '../elements';
import {NanoScroller} from '../nanoscroller';
import {VisibilityWatcher} from '../visibilitywatcher';
import {IChat} from './ichat';
import {IElements} from './ielements';
import {IScrollManager} from './iscrollmanager';


/** @inheritDoc */
export class ScrollManager implements IScrollManager {
	/** @ignore */
	private messageCountLock: {}	= {};

	/** @ignore */
	private scrollDownLock: {}		= {};

	/** @inheritDoc */
	public unreadMessages: number	= 0;

	/** @ignore */
	private async mutationObserverHandler (mutation: MutationRecord) : Promise<void> {
		const $elem: JQuery	= $(
			mutation.addedNodes.length > 0 ?
				mutation.addedNodes[0] :
				mutation.target
		);

		const messageIndex	= parseInt($elem.attr('message-index'), 10);
		const message		= isNaN(messageIndex) ? null : this.chat.messages[messageIndex];

		/* Process read-ness and scrolling */
		if (message && message.unread) {
			NanoScroller.update();

			this.updateMessageCount();

			if (!VisibilityWatcher.isVisible) {
				await VisibilityWatcher.waitForChange();
			}

			const currentScrollPosition: number	=
				(<any> this.elements.messageList()).scrollPosition()
			;

			if (($elem.height() + 100) > currentScrollPosition) {
				await this.scrollDown();
			}
			else if (!$elem.is(':appeared')) {
				(<any> $elem).appear();
				await new Promise(resolve => $elem.one('appear', resolve));
			}

			message.unread	= false;
			this.updateMessageCount();
		}

		/* Process image lightboxes */
		else if ($elem.is('p:not(.processed)')) {
			const $html: JQuery	= $($elem[0].outerHTML);

			$html.find('img').each((i: number, elem: HTMLElement) => {
				const $this: JQuery	= $(elem);

				if ($this.parent().prop('tagName').toLowerCase() !== 'a') {
					const $a: JQuery	= $(document.createElement('a'));

					$a.attr('href', $this.attr('src'));

					$this.before($a);
					$this.detach();
					$a.append($this);

					Util.getValue(
						$a,
						'magnificPopup',
						(o: JQuery) => {}
					).call($a, {type: 'image'});
				}
			});

			$html.addClass('processed');

			$elem.replaceWith($html);
		}
	}

	/** @ignore */
	private updateMessageCount () : void {
		Util.lock(this.messageCountLock, async () => {
			this.unreadMessages	= this.chat.messages.filter(o => o.unread).length;

			if (this.messageCountInTitle) {
				this.elements.title().text(
					(this.unreadMessages > 0 ? `(${this.unreadMessages}) ` : '') +
					this.elements.title().text().replace(/^\(\d+\) /, '')
				);
			}

			await Util.sleep();
		});
	}

	/** @inheritDoc */
	public async scrollDown (shouldScrollCyphertext?: boolean) : Promise<void> {
		return Util.lock(
			this.scrollDownLock,
			async () => {
				await Util.sleep();

				const $elem	= shouldScrollCyphertext ?
					this.elements.cyphertext() :
					this.elements.messageList()
				;

				await $elem.animate({scrollTop: $elem[0].scrollHeight}, 350).promise();
			},
			true,
			true
		);
	}

	constructor (
		/** @ignore */
		private readonly chat: IChat,

		/** @ignore */
		private readonly elements: IElements,

		/** @ignore */
		private readonly messageCountInTitle?: boolean
	) { (async () => {
		if (this.chat.isMobile) {
			this.elements.messageBox().focus(() => this.scrollDown());
		}

		while (this.elements.messageListInner().length < 1) {
			await Util.sleep();
		}

		new MutationObserver(mutations => {
			for (let mutationRecord of mutations) {
				this.mutationObserverHandler(mutationRecord);
			}
		}).observe(this.elements.messageListInner()[0], {
			attributes: false,
			characterData: false,
			childList: true,
			subtree: true
		});

		NanoScroller.update();

		/* Workaround for jQuery appear plugin */
		this.elements.messageList().scroll(() => Elements.window().trigger('scroll'));
	})(); }
}
