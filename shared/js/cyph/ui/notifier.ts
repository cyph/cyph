import {Config} from '../config';
import {Env} from '../env';
import {INotifier} from './inotifier';
import {VisibilityWatcher} from './visibilitywatcher';


export class Notifier implements INotifier {
	private static audio : {play: Function}	= Audio ?
		new Audio(Config.notifierConfig.audio) :
		{play: () => {}}
	;

	private static createNotification (message: string, callback: Function = () => {}) : void {
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
					register(Config.webSignConfig.serviceWorker).
					then(serviceWorkerRegistration => {
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


	private disableNotify: boolean		= false;
	private openNotifications: any[]	= [];

	public notify (message: string) : void {
		if (!this.disableNotify && !VisibilityWatcher.isVisible) {
			this.disableNotify	= true;

			Notifier.createNotification(message, notification => {
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
