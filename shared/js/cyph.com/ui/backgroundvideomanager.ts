module Cyph.com {
	export module UI {
		/**
		 * Manages the video in the background of the website.
		 */
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

			private adjustMargins () : void {
				const heightDelta: number			= window.innerHeight - this.previousHeight;
				const isAddressBarHidden: boolean	= heightDelta > 0 && heightDelta < 75;
				this.previousHeight					= window.innerHeight;

				const windowAspectRatio: number	= window.innerWidth / window.innerHeight;
				const aspectRatio: boolean		= windowAspectRatio > BackgroundVideoManager.videoAspectRatio;

				if (aspectRatio === this.previousAspectRatio && isAddressBarHidden) {
					return;
				}

				this.previousAspectRatio	= aspectRatio;

				if (aspectRatio) {
					const height: number	= window.innerWidth / BackgroundVideoManager.videoAspectRatio;

					Elements.backgroundVideo.css({
						height,
						width: window.innerWidth,
						'margin-top': 0 - ((height - window.innerHeight) / 2) + (BackgroundVideoManager.addressBarHeight / 2),
						'margin-left': 0
					});
				}
				else {
					const height: number	= window.innerHeight + BackgroundVideoManager.addressBarHeight;
					const width: number		= BackgroundVideoManager.videoAspectRatio * height;

					Elements.backgroundVideo.css({
						height,
						width,
						'margin-top': 0,
						'margin-left': 0 - ((width - window.innerWidth) / 2)
					});
				}
			}

			public constructor () {
				/* Disable background video on mobile */

				if (Cyph.Env.isMobile) {
					const $mobilePoster: JQuery	= $('<img />');
					$mobilePoster.attr('src', Elements.backgroundVideo.attr('mobile-poster'));

					Elements.backgroundVideo.replaceWith($mobilePoster).remove();
					Elements.backgroundVideo	= $mobilePoster;
				}


				this.adjustMargins();
				Cyph.UI.Elements.window.on('resize', () => this.adjustMargins());
				Cyph.UrlState.onchange(() => setTimeout(() => this.adjustMargins(), 500));
			}
		}
	}
}
