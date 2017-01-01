import {Injectable} from '@angular/core';
import {config} from '../../config';
import {env} from '../../env';
import {VisibilityWatcherService} from './visibility-watcher.service';


/**
 * Manages user-facing notifications.
 */
@Injectable()
export class NotificationService {
	/** @ignore */
	private static readonly config	= {
		audio: '/audio/beep.mp3',
		icon: customBuildFavicon || '/img/favicon/favicon-192x192.png',
		title: 'Cyph'
	};

	/** @ignore */
	private static readonly audio: {play: Function}	= Audio ?
		new Audio(NotificationService.config.audio) :
		{play: () => {}}
	;

	/** @ignore */
	private static createNotification (message: string, callback: Function = () => {}) : void {
		const options	= {
			audio: <string|undefined> undefined,
			body: message,
			icon: NotificationService.config.icon,
			lang: env.language,
			noscreen: false,
			sticky: false
		};

		try {
			callback(new (<any> self).Notification(NotificationService.config.title, options));

			try {
				NotificationService.audio.play();
			}
			catch (_) {}
		}
		catch (_) {
			try {
				options.audio	= NotificationService.config.audio;

				(<any> navigator).serviceWorker.
					register(config.webSignConfig.serviceWorker).
					then((serviceWorkerRegistration: any) => {
						try {
							serviceWorkerRegistration.showNotification(
								NotificationService.config.title,
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


	/** Indicates whether notifications are currently silenced. */
	public disableNotify: boolean				= false;

	/** Currently open notification objects. */
	public readonly openNotifications: any[]	= [];

	/**
	 * If user isn't currently viewing this window, sends notification.
	 * @param message
	 */
	public notify (message: string) : void {
		if (!this.disableNotify && !this.visibilityWatcherService.isVisible) {
			this.disableNotify	= true;

			NotificationService.createNotification(message, (notification: any) => {
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

	constructor (
		/** @see VisibilityWatcherService */
		public readonly visibilityWatcherService: VisibilityWatcherService
	) {
		this.visibilityWatcherService.onChange((isVisible: boolean) => {
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
			(<any> self).Notification.requestPermission();
		}
		catch (_) {}
	}
}
