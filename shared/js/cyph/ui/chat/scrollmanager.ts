			let scrollDownLock	= 0;

			public scrollDown (shouldScrollCyphertext) {
				if (scrollDownLock < 1) {
					try {
						++scrollDownLock;

						(shouldScrollCyphertext ?
							UI.Elements.cyphertext :
							UI.Elements.messageList
						).each(() => {
							++scrollDownLock;

							$(this).animate({scrollTop: this.scrollHeight}, 350, () => {
								--scrollDownLock;
							});
						});

						scrolling.update();
					}
					finally {
						--scrollDownLock;
					}
				}
			}



			/* Visibility */

			if (!Cyph.Env.isMobile) {
				window.Visibility	= new FocusVisibility;
			}


			/* Init */

			if (Cyph.Env.isMobile) {
				UI.Elements.html.addClass('mobile');

				UI.Elements.messageBox.focus(() => {
					this.scrollDown();
				});
			}


			/* OS X-style scrollbars */

			scrolling	= {
				isNanoScroller: !Cyph.Env.isMobile && Cyph.Env.userAgent.indexOf('mac os x') < 0,
				update: () => {
					if (this.isNanoScroller) {
						$('.nano').nanoScroller();
					}
				}
			};

			if (!scrolling.isNanoScroller) {
				$('.nano, .nano-content').removeClass('nano').removeClass('nano-content');
			}


			/* For notify and mobile fullscreen */

			Visibility.change((e, state) => {
				if (state !== 'hidden') {
					disableNotify	= false;
					while (openNotifications.length > 0) {
						openNotifications.pop().close();
					}
				}
				else if (setUpFullScreenEvent) {
					setUpFullScreenEvent();
				}
			});

			let observer	= new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					let $elem		= $(mutation.addedNodes.length > 0 ? mutation.addedNodes[0] : mutation.target);

					/* Process read-ness and scrolling */
					if ($elem.is('.message-item.unread')) {
						let isHidden	= Visibility.hidden();
						let currentScrollPosition	=
							UI.Elements.messageList[0].scrollHeight -
							(UI.Elements.messageList[0].scrollTop + UI.Elements.messageList[0].clientHeight)
						;

						if (!isHidden && ($elem.height() + 50) > currentScrollPosition) {
							this.scrollDown();
							$elem.removeClass('unread');
						}

						setTimeout(() => {
							if (
								(isHidden || !$elem.is(':appeared')) &&
								!$elem.find('*').add($elem.parentsUntil().addBack()).is('.app-message')
							) {
								this.controller.update(() => { this.unreadMessages += 1 });

								let intervalId	= setInterval(() => {
									if (
										!Visibility.hidden() &&
										($elem.is(':appeared') || $elem.nextAll('.message-item:not(.unread)').length > 0)
									) {
										clearInterval(intervalId);
										$elem.removeClass('unread');
										this.controller.update(() => { this.unreadMessages -= 1 });

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
						let $html	= $($elem[0].outerHTML);

						$html.find('img:not(.emoji)').each(() => {
							let $this	= $(this);

							if ($this.parent().prop('tagName').toLowerCase() !== 'a') {
								let $a	= $('<a></a>')
								$a.attr('href', $this.attr('src'));

								$this.before($a);
								$this.detach();
								$a.append($this);

								$a.magnificPopup({type: 'image'});
							}
						});

						$html.addClass('processed');

						$elem.replaceWith($html);
					}

					/* Amazon affiliate links */
					Affiliate.process($elem, $mdDialog);
				});
			});

			observer.observe($('#message-list md-list')[0], {
				childList: true,
				attributes: false,
				characterData: false,
				subtree: true
			});


			scrolling.update();