import {Util} from '../../util';
import {IDialogManager} from '../idialogmanager';
import {NanoScroller} from '../nanoscroller';
import {VisibilityWatcher} from '../visibilitywatcher';
import {IChat} from './ichat';
import {IElements} from './ielements';
import {IScrollManager} from './iscrollmanager';


/** @inheritDoc */
export class ScrollManager implements IScrollManager {
	/** @ignore */
	private scrollDownLock: number	= 0;

	/** @inheritDoc */
	public unreadMessages: number	= 0;

	/** @ignore */
	private async mutationObserverHandler (mutation: MutationRecord) : Promise<void> {
		const $elem: JQuery	= $(
			mutation.addedNodes.length > 0 ?
				mutation.addedNodes[0] :
				mutation.target
		);

		/* Process read-ness and scrolling */
		if ($elem.is('.message-item.unread')) {
			const currentScrollPosition: number	= this.elements.messageList()['scrollPosition']();

			if (
				VisibilityWatcher.isVisible &&
				($elem.height() + 50) > currentScrollPosition
			) {
				this.scrollDown();
				$elem.removeClass('unread');
			}

			await Util.sleep();

			if (
				(
					VisibilityWatcher.isVisible &&
					$elem.is(':appeared')
				) ||
				$elem.find('*').add($elem.parentsUntil().addBack()).is('.app-message')
			) {
				return;
			}

			this.updateMessageCount(1);

			while (
				!VisibilityWatcher.isVisible ||
				!(
					$elem.is(':appeared') ||
					$elem.nextAll('.message-item:not(.unread)').length > 0
				)
			) {
				await Util.sleep();
			}

			$elem.removeClass('unread');
			this.updateMessageCount(-1);

			if ($elem.nextAll().length === 0) {
				this.scrollDown();
			}
		}

		/* Process image lightboxes */
		else if ($elem.is('p:not(.processed)')) {
			const $html: JQuery	= $($elem[0].outerHTML);

			$html.find('img:not(.emoji)').each((i: number, elem: HTMLElement) => {
				const $this: JQuery	= $(elem);

				if ($this.parent().prop('tagName').toLowerCase() !== 'a') {
					const $a: JQuery	= $('<a></a>');

					$a.attr('href', $this.attr('src'));

					$this.before($a);
					$this.detach();
					$a.append($this);

					Util.getValue($a, 'magnificPopup', o => {}).call($a, {type: 'image'});
				}
			});

			$html.addClass('processed');

			$elem.replaceWith($html);
		}
	}

	/** @ignore */
	private updateMessageCount (increment: number) : void {
		this.unreadMessages	+= increment;

		if (!this.messageCountInTitle) {
			return;
		}

		this.elements.title().text(
			(this.unreadMessages > 0 ? `(${this.unreadMessages}) ` : '') +
			this.elements.title().text().replace(/^\(\d+\) /, '')
		);
	}

	/** @inheritDoc */
	public scrollDown (shouldScrollCyphertext?: boolean) : void {
		if (this.scrollDownLock < 1) {
			try {
				++this.scrollDownLock;

				(
					shouldScrollCyphertext ?
						this.elements.cyphertext :
						this.elements.messageList
				)().each((i: number, elem: HTMLElement) => {
					++this.scrollDownLock;

					$(elem).animate(
						{scrollTop: elem.scrollHeight},
						350,
						() => --this.scrollDownLock
					);
				});

				NanoScroller.update();
			}
			finally {
				--this.scrollDownLock;
			}
		}
	}

	constructor (
		dialogManager: IDialogManager,

		/** @ignore */
		private isMobile: boolean,

		/** @ignore */
		private elements: IElements,

		/** @ignore */
		private messageCountInTitle?: boolean
	) { (async () => {
		if (this.isMobile) {
			this.elements.messageBox().focus(this.scrollDown);
		}

		while (this.elements.messageListInner().length < 1) {
			await Util.sleep(500);
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
	})(); }
}
