import * as ua from 'universal-analytics';
import {config} from './config';
import {potassiumUtil} from './crypto/potassium/potassium-util';
import {EnvDeploy, envDeploy} from './env-deploy';
import {geolocation} from './geolocation';
import {arrayAny} from './util/reducers';
import {uuid} from './util/uuid';
import {resolvable} from './util/wait/resolvable';

/**
 * Calls Google Analytics API for page view and event tracking.
 */
export class Analytics {
	/**
	 * Set referrer except when it's a Cyph URL or an encoded form
	 * of a Cyph URL, particularly to avoid leaking shared secret.
	 */
	private readonly referrer =
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		typeof document !== 'undefined' &&
		document.referrer &&
		!arrayAny(
			[
				document.referrer,
				...(document.referrer.match(/[0-9a-fA-F]+/g) || []).map(s => {
					try {
						return potassiumUtil.toString(potassiumUtil.fromHex(s));
					}  catch {
						return '';
					}
				}),
				...(
					'&' +
					document.referrer.substring(
						document.referrer.indexOf('?') + 1
					)
				)
					.split(/\&.*?=/g)
					.map(s => {
						try {
							return potassiumUtil.toString(
								potassiumUtil.fromBase64(s)
							);
						}  catch (e) {
							return '';
						}
					})
			].map(s => /\/\/.*?\.?cyph\.[a-z]+\/?/.test(s))
		) ?
			document.referrer :
			undefined;

	/** @ignore */
	private readonly uid = resolvable<string>();

	/** @ignore */
	private readonly visitor?: Promise<ua.Visitor>;

	/** @ignore */
	private async baseSend (visit: ua.Visitor) : Promise<void> {
		return new Promise<void>((resolve, reject) => {
			visit.send(err => {
				if (err) {
					reject(err);
				}
				else {
					resolve();
				}
			});
		});
	}

	/** Sends event. */
	public async sendEvent (
		category: string,
		action: string,
		label?: string,
		value?: string | number
	) : Promise<void> {
		const visitor = await this.visitor;

		if (!visitor) {
			return;
		}

		return this.baseSend(
			label === undefined ?
				visitor.event(category, action) :
			value === undefined ?
				visitor.event(category, action, label) :
				visitor.event(category, action, label, value)
		);
	}

	/** Sends exception. */
	public async sendException (description: string) : Promise<void> {
		const visitor = await this.visitor;

		if (!visitor) {
			return;
		}

		return this.baseSend(visitor.exception(description));
	}

	/** Sends transaction. */
	public async sendTransaction (
		price: number,
		quantity: number,
		sku?: string
	) : Promise<void> {
		const visitor = await this.visitor;

		if (!visitor) {
			return;
		}

		return this.baseSend(
			sku === undefined ?
				visitor.item(price, quantity) :
				visitor.item(price, quantity, sku)
		);
	}

	/** Sets UID. */
	public setUID (uid: string = uuid()) : void {
		this.uid.resolve(uid);
	}

	constructor (
		/** @see EnvDeploy */
		public readonly env: EnvDeploy = envDeploy
	) {
		if (this.env.isSDK) {
			return;
		}

		const appName = this.env.host;
		const appVersion = this.env.isWeb ? 'Web' : 'Native';

		this.visitor = (async () => {
			const visitor = ua(config.analConfig.accountID, await this.uid, {
				hostname: this.env.baseUrl.split('/').slice(0, 3).join('/'),
				https: this.env.baseUrl.startsWith('https://'),
				path: '/analytics/collect',
				strictCidFormat: false
			});

			visitor.set('aip', '1');
			visitor.set('an', appName);
			visitor.set('av', appVersion);

			if (this.referrer) {
				visitor.set('dr', this.referrer);
			}

			try {
				visitor.set('geoid', await geolocation.analID);
			}
			catch {}

			/* Prepend with /analsandbox for continuity of data */
			await this.baseSend(
				visitor.pageview(
					`/analsandbox/${appName}${locationData.pathname}${locationData.search}`
				)
			);

			return visitor;
		})();
	}
}
