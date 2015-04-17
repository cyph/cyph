/// <reference path="visibilitywatcher.ts" />
/// <reference path="../../global/base.ts" />


module Cyph {
	export module UI {
		export class Notifier {
			public static notifyTitle: string	= 'Cyph';
			public static notifyIcon: string	= '/img/favicon/apple-touch-icon-180x180.png';
			public static notifyAudio			= new Audio('/audio/beep.mp3');


			public disableNotify: boolean	= false;
			public openNotifications: any[]	= [];

			public notify (message: string) : void {
				if (!this.disableNotify && !VisibilityWatcher.isVisible) {
					if (Notification) {
						let notification	= new Notification(
							Notifier.notifyTitle,
							{body: message, icon: Notifier.notifyIcon}
						);

						this.openNotifications.push(notification);

						notification.onclose	= () => {
							while (this.openNotifications.length > 0) {
								this.openNotifications.pop().close();
							}

							if (!VisibilityWatcher.isVisible) {
								this.disableNotify	= true;
							}
						};

						notification.onclick	= () => {
							self.focus();
							notification.onclose();
						};
					}

					Notifier.notifyAudio.play();

					Util.getValue<any>(navigator, 'vibrate', () => {})(200);
				}
			}

			public constructor () {
				if (Notification) {
					Notification.requestPermission();
				}
			}
		}
	}
}
