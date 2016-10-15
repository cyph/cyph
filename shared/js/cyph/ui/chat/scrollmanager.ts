import {IChat} from './ichat';
import {IElements} from './ielements';
import {IScrollManager} from './iscrollmanager';
import {IDialogManager} from '../idialogmanager';
import {NanoScroller} from '../nanoscroller';
import {VisibilityWatcher} from '../visibilitywatcher';
import {Util} from '../../util';


export class ScrollManager implements IScrollManager {
	private scrollDownLock: number	= 0;

	public unreadMessages: number	= 0;

	private mutationObserverHandler (mutation: MutationRecord) : void {
		const $elem: JQuery	= $(
			mutation.addedNodes.length > 0 ?
				mutation.addedNodes[0] :
				mutation.target
		);

		/* Process read-ness and scrolling */
		if ($elem.is('.message-item.unread')) {
			const currentScrollPosition: number	= this.elements.messageList['scrollPosition']();

			if (
				VisibilityWatcher.isVisible &&
				($elem.height() + 50) > currentScrollPosition)
			{
				this.scrollDown();
				$elem.removeClass('unread');
			}

			setTimeout(() => {
				if (
					(
						!VisibilityWatcher.isVisible ||
						!$elem.is(':appeared')
					) &&
					!$elem.find('*').add($elem.parentsUntil().addBack()).is('.app-message')
				) {
					this.updateMessageCount(1);

					const intervalId	= setInterval(() => {
						if (
							VisibilityWatcher.isVisible &&
							(
								$elem.is(':appeared') ||
								$elem.nextAll('.message-item:not(.unread)').length > 0
							)
						) {
							clearInterval(intervalId);

							$elem.removeClass('unread');
							this.updateMessageCount(-1);

							if ($elem.nextAll().length === 0) {
								this.scrollDown();
							}
						}
					}, 100);
				}
			}, 250);
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

	private updateMessageCount (increment: number) : void {
		this.unreadMessages	+= increment;

		if (!this.messageCountInTitle) {
			return;
		}

		this.elements.title.text(
			(this.unreadMessages > 0 ? `(${this.unreadMessages}) ` : '') +
			this.elements.title.text().replace(/^\(\d+\) /, '')
		);
	}

	public scrollDown (shouldScrollCyphertext?: boolean) : void {
		if (this.scrollDownLock < 1) {
			try {
				++this.scrollDownLock;

				(
					shouldScrollCyphertext ?
						this.elements.cyphertext :
						this.elements.messageList
				).each((i: number, elem: HTMLElement) => {
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

	/**
	 * @param dialogManager
	 * @param isMobile
	 * @param elements
	 * @param messageCountInTitle
	 */
	public constructor (
		dialogManager: IDialogManager,
		private isMobile: boolean,
		private elements: IElements,
		private messageCountInTitle?: boolean
	) {
		if (this.isMobile) {
			this.elements.messageBox.focus(this.scrollDown);
		}

		new MutationObserver(mutations => {
			for (let mutationRecord of mutations) {
				this.mutationObserverHandler(mutationRecord);
			}
		}).observe(this.elements.messageListInner[0], {
			childList: true,
			attributes: false,
			characterData: false,
			subtree: true
		});
	}
}
