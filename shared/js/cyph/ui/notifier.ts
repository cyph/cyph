import {config} from '../config';
import {env} from '../env';
import {INotifier} from './inotifier';
import {visibilityWatcher} from './visibilitywatcher';


/** @inheritDoc */
export class Notifier implements INotifier {
	/** @ignore */
	private static readonly audio: {play: Function}	= Audio ?
		new Audio(config.notifierConfig.audio) :
		{play: () => {}}
	;

	/** @ignore */
	private static createNotification (message: string, callback: Function = () => {}) : void {
		const options	= {
			audio: <string> null,
			body: message,
			icon: config.notifierConfig.icon,
			lang: env.language,
			noscreen: false,
			sticky: false
		};

		try {
			callback(new (<any> self).Notification(config.notifierConfig.title, options));

			try {
				Notifier.audio.play();
			}
			catch (_) {}
		}
		catch (_) {
			try {
				options.audio	= config.notifierConfig.audio;

				(<any> navigator).serviceWorker.
					register(config.webSignConfig.serviceWorker).
					then((serviceWorkerRegistration: any) => {
						try {
							serviceWorkerRegistration.showNotification(
								config.notifierConfig.title,
								options
							);
						}
						catch (_) {}
					}).
					catch(() => {})
				;
			}
			catch (_) {}
		}
	}


	/** @ignore */
	private disableNotify: boolean				= false;

	/** @ignore */
	private readonly openNotifications: any[]	= [];

	/** @inheritDoc */
	public notify (message: string) : void {
		if (!this.disableNotify && !visibilityWatcher.isVisible) {
			this.disableNotify	= true;

			Notifier.createNotification(message, (notification: any) => {
				try {
					this.openNotifications.push(notification);

					notification.onclick	= () => {
						notification.close();
						self.focus();
					};
				}
				catch (_) {}
			});
		}
	}

	constructor () {
		visibilityWatcher.onChange((isVisible: boolean) => {
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
			(<any> self).Notification.requestPermission();
		}
		catch (_) {}
	}
}
