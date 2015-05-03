/// <reference path="iscrollmanager.ts" />


module Cyph {
	export module UI {
		export module Chat {
			export class ScrollManager implements IScrollManager {
				private scrollDownLock: number	= 0;

				private affiliate: Affiliate;

				public unreadMessages: number	= 0;

				private mutationObserverHandler (mutation: MutationRecord) : void {
					let $elem: JQuery	= $(
						mutation.addedNodes.length > 0 ?
							mutation.addedNodes[0] :
							mutation.target
					);

					/* Process read-ness and scrolling */
					if ($elem.is('.message-item.unread')) {
						let currentScrollPosition: number	= Elements.messageList['scrollPosition']();

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
								this.unreadMessages	+= 1;
								this.controller.update();

								let intervalId	= setInterval(() => {
									if (
										VisibilityWatcher.isVisible &&
										(
											$elem.is(':appeared') ||
											$elem.nextAll('.message-item:not(.unread)').length > 0
										)
									) {
										clearInterval(intervalId);

										$elem.removeClass('unread');
										this.unreadMessages	-= 1;
										this.controller.update();

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
						let $html: JQuery	= $($elem[0].outerHTML);

						$html.find('img:not(.emoji)').each((i: number, elem: HTMLElement) => {
							let $this: JQuery	= $(elem);

							if ($this.parent().prop('tagName').toLowerCase() !== 'a') {
								let $a: JQuery	= $('<a></a>');

								$a.attr('href', $this.attr('src'));

								$this.before($a);
								$this.detach();
								$a.append($this);

								Util.getValue($a, 'magnificPopup', o => {}).call($a, {type: 'image'});

								/* Temporary workaround for Angular Material bug */

								if (Env.isMobile) {
									let clickLock: number	= 0;

									$a.click(e => {
										if (clickLock < 2) {
											++clickLock;
											setTimeout(() => $a.click(), 100);
											setTimeout(() => --clickLock, 1500);
										}
										else {
											e.preventDefault();
											e.stopPropagation();
										}
									});
								}
							}
						});

						$html.addClass('processed');

						$elem.replaceWith($html);
					}

					/* Amazon affiliate links */
					this.affiliate.process($elem);
				}

				public scrollDown (shouldScrollCyphertext?: boolean) : void {
					if (this.scrollDownLock < 1) {
						try {
							++this.scrollDownLock;

							(
								shouldScrollCyphertext ?
									Elements.cyphertext :
									Elements.messageList
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

				public constructor (
					private controller: IController,
					dialogManager: IDialogManager,
					private isMobile: boolean
				) {
					this.affiliate	= new Affiliate(dialogManager);

					if (this.isMobile) {
						Elements.messageBox.focus(this.scrollDown);
					}

					new MutationObserver(mutations => {
						for (let mutationRecord of mutations) {
							this.mutationObserverHandler(mutationRecord);
						}
					}).observe(Elements.messageListInner[0], {
						childList: true,
						attributes: false,
						characterData: false,
						subtree: true
					});
				}
			}
		}
	}
}
