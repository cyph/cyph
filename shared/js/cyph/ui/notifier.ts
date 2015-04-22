module Cyph {
	export module UI {
		export class Notifier {
			public static audio	= new Audio(Config.notifierConfig.audio);


			public disableNotify: boolean	= false;
			public openNotifications: any[]	= [];

			public notify (message: string) : void {
				try {
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

						Util.getValue(navigator, 'vibrate', () => {}).call(navigator, 200);
					}
				}
				catch (e) {
					/* Still want to trigger this error email, but a failed
						notification isn't fatal to the rest of the code */
					setTimeout(() => { throw e }, 0);
				}
			}

			public constructor () {
				try {
					if (Notification) {
						Notification.requestPermission();
					}

					VisibilityWatcher.onchange((isVisible: boolean) => {
						if (isVisible) {
							for (let notification of this.openNotifications) {
								notification.close();
							}

							this.openNotifications.length	= 0;
						}
						else {
							this.disableNotify	= false;
						}
					});
				}
				catch (e) {
					setTimeout(() => { throw e }, 0);
				}
			}
		}
	}
}
