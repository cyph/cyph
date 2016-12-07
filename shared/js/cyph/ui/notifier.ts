import {Config} from '../config';
import {Env} from '../env';
import {INotifier} from './inotifier';
import {VisibilityWatcher} from './visibilitywatcher';


/** @inheritDoc */
export class Notifier implements INotifier {
	/** @ignore */
	private static readonly audio: {play: Function}	= Audio ?
		new Audio(Config.notifierConfig.audio) :
		{play: () => {}}
	;

	/** @ignore */
	private static createNotification (message: string, callback: Function = () => {}) : void {
		const options	= {
			audio: <string> null,
			body: message,
			icon: Config.notifierConfig.icon,
			lang: Env.language,
			noscreen: false,
			sticky: false
		};

		try {
			callback(new (<any> self).Notification(Config.notifierConfig.title, options));

			try {
				Notifier.audio.play();
			}
			catch (_) {}
		}
		catch (_) {
			try {
				options.audio	= Config.notifierConfig.audio;

				(<any> navigator).serviceWorker.
					register(Config.webSignConfig.serviceWorker).
					then((serviceWorkerRegistration: any) => {
						try {
							serviceWorkerRegistration.showNotification(
								Config.notifierConfig.title,
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
		if (!this.disableNotify && !VisibilityWatcher.isVisible) {
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
		VisibilityWatcher.onChange((isVisible: boolean) => {
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
