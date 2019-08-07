import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {INotificationService} from '../service-interfaces/inotification.service';
import {sleep} from '../util/wait';
import {EnvService} from './env.service';
import {FaviconService} from './favicon.service';
import {StringsService} from './strings.service';
import {WindowWatcherService} from './window-watcher.service';
import {WorkerService} from './worker.service';

/**
 * @inheritDoc
 */
@Injectable()
export class NotificationService extends BaseProvider
	implements INotificationService {
	/** @ignore */
	private readonly audio?: HTMLAudioElement;

	/** @ignore */
	private readonly config: {audio?: string; title: string} = {
		audio: '/assets/audio/beep.mp3',
		title: this.stringsService.product
	};

	/** Indicates whether notifications are currently silenced. */
	private disableNotify: boolean = false;

	/** Currently open notification objects. */
	private readonly openNotifications: any[] = [];

	/** @ignore */
	private readonly ringtone: HTMLAudioElement = new Audio(
		'/assets/audio/ring.mp3'
	);

	/** Max ring time. */
	public readonly ringTimeout: number = 30000;

	/** @ignore */
	private readonly tag: string = 'NotificationService';

	/** @ignore */
	private async createNotification (message: string) : Promise<any> {
		const options = {
			audio: <string | undefined> undefined,
			body: message,
			icon: this.faviconService.activeFaviconSet.icon256,
			lang: this.envService.language,
			noscreen: false,
			sticky: false
		};

		try {
			const notification = new (<any> self).Notification(
				this.config.title,
				options
			);

			try {
				if (this.audio) {
					this.audio.play().catch(() => {});
				}
			}
			catch {}

			return notification;
		}
		catch {
			options.audio = this.config.audio;

			(await this.workerService
				.serviceWorkerRegistration).showNotification(
				this.config.title,
				options
			);
		}
	}

	/** @inheritDoc */
	public async notify (message: string) : Promise<void> {
		try {
			if (
				(await (<any> self).Notification.requestPermission()) ===
				'denied'
			) {
				return;
			}
		}
		catch {}

		if (this.disableNotify || this.windowWatcherService.visibility.value) {
			return;
		}

		this.disableNotify = true;

		try {
			const notification = await this.createNotification(message);

			notification.onclick = () => {
				notification.close();
				self.focus();
			};

			this.openNotifications.push(notification);
		}
		catch {}
	}

	/**
	 * Rings.
	 * @returns True if accepted or false if timeout.
	 */
	public async ring (accept: Promise<boolean>) : Promise<boolean> {
		try {
			this.ringtone.currentTime = 0;
			await this.ringtone.play();

			return await Promise.race([
				accept,
				sleep(this.ringTimeout).then(() => false)
			]);
		}
		finally {
			this.ringtone.pause();
		}
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly faviconService: FaviconService,

		/** @ignore */
		private readonly stringsService: StringsService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService,

		/** @ignore */
		private readonly workerService: WorkerService
	) {
		super();

		if (this.envService.isMobileOS) {
			this.config.audio = undefined;
		}
		else if (Audio) {
			this.audio = new Audio(this.config.audio);
		}

		this.ringtone.loop = true;

		this.subscriptions.push(
			this.windowWatcherService.visibility.subscribe(isVisible => {
				if (!isVisible) {
					this.disableNotify = false;
					return;
				}

				for (const notification of this.openNotifications) {
					try {
						notification.close();
					}
					catch {}
				}

				this.openNotifications.length = 0;
			})
		);

		try {
			(<any> self).Notification.requestPermission();
		}
		catch {}

		this.workerService
			.serviceWorkerFunction(this.tag, this.tag, tag => {
				self.addEventListener('notificationclick', (e: any) => {
					try {
						if (e.notification.tag !== tag) {
							return;
						}

						e.notification.close();

						e.waitUntil(
							(<any> self).clients
								.matchAll({type: 'window'})
								.then((clientList: any) => {
									for (const client of clientList) {
										try {
											if (!client.focused) {
												return client
													.focus()
													.catch(() => {});
											}
										}
										catch (_) {
											try {
												return clientList.openWindow(
													client
												);
											}
											catch (_) {}
										}
									}
								})
						);
					}
					catch (_) {}
				});
			})
			.catch(() => {});
	}
}
