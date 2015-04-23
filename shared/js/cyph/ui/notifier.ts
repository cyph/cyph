module Cyph {
	export module UI {
		export class Notifier {
			public static audio	= new Audio(Config.notifierConfig.audio);

			private static createNotification (message: string, callback: Function = () => {}) {
				let options	= {
					body: message,
					icon: Config.notifierConfig.icon,
					audio: Config.notifierConfig.audio,
					vibrate: 200,
					lang: Env.language,
					tag: Util.generateGuid()
				};

				try {
					navigator['serviceWorker'].
						register(Cyph.Config.webSignConfig.serviceWorker).
						then(serviceWorkerRegistration => {
							try {
								serviceWorkerRegistration.
									showNotification(Config.notifierConfig.title, options).
									then(() =>
										serviceWorkerRegistration.
											getNotifications(options.tag).
											then(notifications =>
												notifications && callback(notifications[0])
											)
								);
							}
							catch (_) {}
						}
					);
				}
				catch (_) {
					try {
						Notifier.audio.play();
					}
					catch (_) {}
					try {
						Util.getValue(navigator, 'vibrate', () => {}).call(navigator, options.vibrate);
					}
					catch (_) {}

					options.audio	= null;
					options.vibrate	= null;

					try {
						callback(new self['Notification'](Config.notifierConfig.title, options));
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

							notification.onerror	= notification.onclose;

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
