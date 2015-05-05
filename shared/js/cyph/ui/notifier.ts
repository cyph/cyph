module Cyph {
	export module UI {
		export class Notifier {
			public static audio : {play: Function}	= Audio ?
				new Audio(Config.notifierConfig.audio) :
				{play: () => {}}
			;

			private static createNotification (message: string, callback: Function = () => {}) {
				const options	= {
					audio: null,
					body: message,
					icon: Config.notifierConfig.icon,
					lang: Env.language,
					noscreen: false,
					sticky: false
				};

				try {
					callback(new self['Notification'](Config.notifierConfig.title, options));

					try {
						Notifier.audio.play();
					}
					catch (_) {}
				}
				catch (_) {
					try {
						options.audio	= Config.notifierConfig.audio;

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
						for (const notification of this.openNotifications) {
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
