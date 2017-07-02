import {Injectable} from '@angular/core';
import {SecureStorage} from 'nativescript-secure-storage';
import {potassiumUtil} from './js/cyph/crypto/potassium/potassium-util';
import {DataType} from './js/cyph/data-type';
import {LocalStorageService} from './js/cyph/services/local-storage.service';
import {util} from './js/cyph/util';


/**
 * Provides local storage functionality for native app.
 */
@Injectable()
export class NativeLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly storage: SecureStorage	= new SecureStorage();

	/** @inheritDoc */
	public async getItem (url: string) : Promise<Uint8Array> {
		await this.pendingSets.get(url);

		const value	= await this.storage.get({key: url});

		if (typeof value !== 'string') {
			throw new Error(`Item ${url} not found.`);
		}

		return potassiumUtil.fromBase64(value);
	}

	/** @inheritDoc */
	public async removeItem (url: string) : Promise<void> {
		await this.getItem(url);
		await this.storage.remove({key: url});
	}

	/** @inheritDoc */
	public async setItem (url: string, value: DataType) : Promise<{url: string}> {
		const promise	= (async () => {
			await this.storage.set({
				key: url,
				value: potassiumUtil.toBase64(await util.toBytes(value))
			});

			return {url};
		})();

		this.pendingSets.set(url, promise.then(() => {}));

		try {
			return await promise;
		}
		finally {
			this.pendingSets.delete(url);
		}
	}

	constructor () {
		super();
	}
}
