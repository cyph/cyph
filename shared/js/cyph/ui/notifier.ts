/// <reference path="visibilitywatcher.ts" />
/// <reference path="../config.ts" />
/// <reference path="../../global/base.ts" />


module Cyph {
	export module UI {
		export class Notifier {
			public static audio	= new Audio(Config.notifierConfig.audio);


			public disableNotify: boolean	= false;
			public openNotifications: any[]	= [];

			public notify (message: string) : void {
				if (!this.disableNotify && !VisibilityWatcher.isVisible) {
					if (Notification) {
						let notification	= new Notification(
							Config.notifierConfig.title,
							{
								body: message, 
								icon: Config.notifierConfig.icon
							}
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

					Notifier.audio.play();

					Util.getValue<any>(navigator, 'vibrate', () => {})(200);
				}
			}

			public constructor () {
				if (Notification) {
					Notification.requestPermission();
				}

				VisibilityWatcher.onchange((isVisible: boolean) => {
					if (isVisible) {
						this.openNotifications.forEach(notification => notification.close());
						this.openNotifications.length	= 0;
					}
					else {
						this.disableNotify	= false;
					}
				});
			}
		}
	}
}
