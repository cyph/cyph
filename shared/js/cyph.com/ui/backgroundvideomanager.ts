module Cyph.com {
	export module UI {
		export class BackgroundVideoManager {
			private static addressBarHeight: number	= 60;
			private static videoAspectRatio: number	= 16 / 9;

			private static logoHidePaddingWidth: number		= 150;
			private static logoHidePaddingHeight: number	=
				BackgroundVideoManager.logoHidePaddingWidth /
				BackgroundVideoManager.videoAspectRatio
			;

			private previousHeight: number	= window.innerHeight;

			private previousAspectRatio: boolean;
			private pullInterval: any;

			public adjustMargins () : void {
				if (!Cyph.Env.isMobile || Cyph.Env.isTablet) {
					Elements.featureListItems.css('height', '');
					Elements.featureListItems.find('[class*="pull"]').css('left', '');

					setTimeout(() => {
						for (let pair of [[0, 3], [1, 4], [2, 5]]) {
							let $a: JQuery	= Elements.featureListItems.eq(pair[0]);
							let $b: JQuery	= Elements.featureListItems.eq(pair[1]);

							$a.add($b).height(Math.max($a.height(), $b.height()));
						}

						clearInterval(this.pullInterval);

						this.pullInterval	= setInterval(() => {
							let $pulledElements: JQuery	= Elements.featureListItems.
								filter('.animated').
								find('[class*="pull"]')
							;

							setTimeout(() => {
								$pulledElements.each((i: number, elem: HTMLElement) => {
									let $this: JQuery	= $(elem);
									let offset			= $this.offset();

									if (offset.left < 0) {
										$this.css('left', '0px');
									}
								});
							}, 2500);
						}, 2500);
					}, 250);
				}


				let heightDelta: number			= window.innerHeight - this.previousHeight;
				let isAddressBarHidden: boolean	= heightDelta > 0 && heightDelta < 75;
				this.previousHeight				= window.innerHeight;

				let windowAspectRatio: number	= window.innerWidth / window.innerHeight;
				let aspectRatio: boolean		= windowAspectRatio > BackgroundVideoManager.videoAspectRatio;

				if (aspectRatio === this.previousAspectRatio && isAddressBarHidden) {
					return;
				}

				this.previousAspectRatio	= aspectRatio;

				if (aspectRatio) {
					let height: number	= window.innerWidth / BackgroundVideoManager.videoAspectRatio;

					Elements.backgroundVideo.css({
						height,
						width: window.innerWidth,
						'margin-top': 0 - ((height - window.innerHeight) / 2) + (BackgroundVideoManager.addressBarHeight / 2),
						'margin-left': 0
					});
				}
				else {
					let height: number	= window.innerHeight + BackgroundVideoManager.addressBarHeight;
					let width: number	= BackgroundVideoManager.videoAspectRatio * height;

					Elements.backgroundVideo.css({
						height,
						width,
						'margin-top': 0,
						'margin-left': 0 - ((width - window.innerWidth) / 2)
					});
				}
			}

			public constructor () {
				/* Disable background video on mobile and Tor */

				if (Cyph.Env.isMobile || Cyph.Env.isOnion) {
					let $mobilePoster: JQuery	= $('<img />');
					$mobilePoster.attr('src', Elements.backgroundVideo.attr('mobile-poster'));

					Elements.backgroundVideo.replaceWith($mobilePoster);
					Elements.backgroundVideo	= $mobilePoster;
				}


				this.adjustMargins();
				Cyph.UI.Elements.window.on('resize', () => this.adjustMargins());
			}
		}
	}
}
