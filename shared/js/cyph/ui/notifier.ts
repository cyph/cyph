module Cyph {
	export module UI {
		export class Notifier {
			public static audio	= new Audio(Config.notifierConfig.audio);

			private static createNotification (message: string, callback: Function = () => {}) {
				let options	= {
					audio: null,
					body: message,
					icon: Config.notifierConfig.icon,
					lang: Env.language,
					noscreen: false,
					sticky: false,
					vibrate: null
				};

				try {
					try {
						Notifier.audio.play();
					}
					catch (_) {}
					try {
						Util.getValue(navigator, 'vibrate', () => {}).call(
							navigator,
							Config.notifierConfig.vibrator
						);
					}
					catch (_) {}

					callback(new self['Notification'](Config.notifierConfig.title, options));
				}
				catch (_) {
					try {
						options.audio	= Config.notifierConfig.audio;
						options.vibrate	= Config.notifierConfig.vibrator;

						navigator['serviceWorker'].
							register(Cyph.Config.webSignConfig.serviceWorker).
							then(serviceWorkerRegistration => {
								try {
									serviceWorkerRegistration.showNotification(
										Config.notifierConfig.title,
										options
									);
								}
								catch (_) {}
							})
						;
					}
					catch (_) {}
				}
			}


			public disableNotify: boolean	= false;
			public openNotifications: any[]	= [];

			public notify (message: string) : void {
				if (!this.disableNotify && !VisibilityWatcher.isVisible) {
					Notifier.createNotification(message, notification => {
						try {
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
						catch (_) {}
					});
				}
			}

			public constructor () {
				VisibilityWatcher.onchange((isVisible: boolean) => {
					if (isVisible) {
						for (let notification of this.openNotifications) {
							try {
								notification.close();
							}
							catch (_) {}
						}

						this.openNotifications.length	= 0;
					}
					else {
						this.disableNotify	= false;
					}
				});

				try {
					self['Notification'].requestPermission();
				}
				catch (_) {}
			}
		}
	}
}
