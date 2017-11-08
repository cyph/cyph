import {Injectable} from '@angular/core';
import {SecureStorage} from 'nativescript-secure-storage';
import {potassiumUtil} from './js/cyph/crypto/potassium/potassium-util';
import {IProto} from './js/cyph/iproto';
import {LocalStorageService} from './js/cyph/services/local-storage.service';
import {deserialize, serialize} from './js/cyph/util/serialization';


/**
 * Provides local storage functionality for native app.
 */
@Injectable()
export class NativeLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly storage: SecureStorage	= new SecureStorage();

	/** @inheritDoc */
	public async clear () : Promise<void> {
		throw new Error('Blocked on nativescript-secure-storage adding support.');
	}

	/** @inheritDoc */
	public async getItem<T> (url: string, proto: IProto<T>) : Promise<T> {
		await this.pendingSets.get(url);

		const value	= await this.storage.get({key: url});

		if (typeof value !== 'string') {
			throw new Error(`Item ${url} not found.`);
		}

		return deserialize(proto, potassiumUtil.fromBase64(value));
	}

	/** @inheritDoc */
	public async removeItem (url: string) : Promise<void> {
		if (await this.hasItem(url)) {
			await this.storage.remove({key: url});
		}
	}

	/** @inheritDoc */
	public async setItem<T> (url: string, proto: IProto<T>, value: T) : Promise<{url: string}> {
		const promise	= (async () => {
			await this.storage.set({
				key: url,
				value: potassiumUtil.toBase64(await serialize(proto, value))
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
