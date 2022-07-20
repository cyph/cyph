/* eslint-disable max-lines */

import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {filter, skip} from 'rxjs/operators';
import {BaseProvider} from '../../base-provider';
import {MaybePromise} from '../../maybe-promise-type';
import {toInt} from '../../util/formatting';
import {request} from '../../util/request';
import {reloadWindow} from '../../util/window';
import {EnvService} from '../env.service';
import {WindowWatcherService} from '../window-watcher.service';

/**
 * Angular service for WebSign.
 */
@Injectable()
export class WebSignService extends BaseProvider {
	/** Indicates whether automatic updates should be applied. */
	public readonly autoUpdateEnable = new BehaviorSubject<boolean>(true);

	/** Timeout before automatic update is applied. */
	public readonly autoUpdateTimeout = 300_000;

	/** Watches for package updates. */
	public watchPackageUpdates (
		confirmHandler: () => MaybePromise<boolean> = () => true
	) : void {
		this.subscriptions.push(
			this.windowWatcherService.visibility
				.pipe(
					skip(1),
					filter(visible => visible)
				)
				.subscribe(async () => {
					/* Check for updates to keep long-running background instances in sync */
					try {
						const packageTimestamp =
							!this.envService.isLocalEnv &&
							this.autoUpdateEnable.value ?
								/* eslint-disable-next-line @typescript-eslint/tslint/config */
								localStorage.getItem(
									'webSignPackageTimestamp'
								) :
								undefined;

						if (!packageTimestamp) {
							throw new Error();
						}

						const webSignPackageName =
							/* eslint-disable-next-line @typescript-eslint/tslint/config */
							localStorage.getItem('webSignPackageName') ||
							/* eslint-disable-next-line @typescript-eslint/tslint/config */
							(localStorage.getItem('webSignCdnUrl') || '')
								.split('/')
								.slice(-2)[0];

						if (!webSignPackageName) {
							throw new Error();
						}

						const currentPackageTimestamp = await request({
							url: `${this.envService.baseUrl}packagetimestamp/${webSignPackageName}`
						});

						if (
							toInt(currentPackageTimestamp) >
								toInt(packageTimestamp) &&
							(await confirmHandler())
						) {
							reloadWindow();
						}
					}
					catch {}
				})
		);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService,

		/** @ignore */
		private readonly windowWatcherService: WindowWatcherService
	) {
		super();
	}
}
