import {util} from '../../util';
import {Elements as CyphElements, elements as cyphElements} from '../elements';
import {nanoScroller} from '../nanoscroller';
import {visibilityWatcher} from '../visibilitywatcher';
import {IChat} from './ichat';
import {IElements} from './ielements';
import {IScrollManager} from './iscrollmanager';


/** @inheritDoc */
export class ScrollManager implements IScrollManager {
	/** @ignore */
	private messageCountLock: {}	= {};

	/** @ignore */
	private scrollDownLocks: {
		cyphertext: {};
		messages: {};
	}	= {
		cyphertext: {},
		messages: {}
	};

	/** @ignore */
	private processedMessages: Map<number, boolean>	= new Map<number, boolean>();

	/** @inheritDoc */
	public unreadMessages: number	= 0;

	/** @ignore */
	private appeared ($elem: JQuery) : boolean {
		const offset	= $elem.offset();
		return offset.top > 0 && offset.top < this.elements.messageList().height();
	}

	/** @ignore */
	private async mutationObserverHandler (mutation: MutationRecord) : Promise<void> {
		const $elem: JQuery	= $(
			mutation.addedNodes.length > 0 ?
				mutation.addedNodes[0] :
				mutation.target
		);

		const messageIndex	= parseInt($elem.attr('message-index'), 10);

		if (isNaN(messageIndex) || this.processedMessages.has(messageIndex)) {
			return;
		}
		this.processedMessages.set(messageIndex, true);

		const message		= this.chat.messages[messageIndex];

		/* Process read-ness and scrolling */
		if (message && message.unread) {
			nanoScroller.update();

			if (!visibilityWatcher.isVisible) {
				this.updateMessageCount();
				await visibilityWatcher.waitForChange();
			}

			const currentScrollPosition: number	=
				(<any> this.elements.messageList()).scrollPosition()
			;

			if (($elem.height() + 150) > currentScrollPosition) {
				await this.scrollDown();
			}
			else {
				this.updateMessageCount();
				while (!this.appeared($elem)) {
					await util.sleep();
				}
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

					util.getValue(
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
		util.lock(this.messageCountLock, async () => {
			this.unreadMessages	= this.chat.messages.filter(o => o.unread).length;

			if (this.messageCountInTitle) {
				this.elements.title().text(
					(this.unreadMessages > 0 ? `(${this.unreadMessages}) ` : '') +
					this.elements.title().text().replace(/^\(\d+\) /, '')
				);
			}

			await util.sleep();
		});
	}

	/** @inheritDoc */
	public async scrollDown (shouldScrollCyphertext?: boolean) : Promise<void> {
		return util.lock(
			shouldScrollCyphertext ?
				this.scrollDownLocks.cyphertext :
				this.scrollDownLocks.messages
			,
			async () => {
				await util.sleep();

				const $elem	= shouldScrollCyphertext ?
					this.elements.cyphertext() :
					this.elements.messageList()
				;

				await $elem.animate({scrollTop: $elem[0].scrollHeight}, 350).promise();

				if (shouldScrollCyphertext) {
					return;
				}

				for (let message of this.chat.messages) {
					if (message.unread) {
						message.unread	= false;
					}
				}
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

		await CyphElements.waitForElement(this.elements.messageListInner);

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

		nanoScroller.update();

		/* Workaround for jQuery appear plugin */
		this.elements.messageList().scroll(() => cyphElements.window().trigger('scroll'));
	})(); }
}
