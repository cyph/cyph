import {Injectable} from '@angular/core';
import {SecureStorage} from 'nativescript-secure-storage';
import {potassiumUtil} from './js/cyph/crypto/potassium/potassium-util';
import {LocalStorageService} from './js/cyph/services/local-storage.service';


/**
 * Provides local storage functionality for native app.
 */
@Injectable()
export class NativeLocalStorageService extends LocalStorageService {
	/** @ignore */
	private readonly storage: SecureStorage	= new SecureStorage();

	/** @inheritDoc */
	protected async clearInternal (_WAIT_FOR_READY: boolean) : Promise<void> {
		await this.storage.removeAll();
	}

	/** @inheritDoc */
	protected async getItemInternal (
		url: string,
		_WAIT_FOR_READY: boolean
	) : Promise<Uint8Array> {
		const value	= await this.storage.get({key: url});

		if (typeof value !== 'string') {
			throw new Error(`Item ${url} not found.`);
		}

		return potassiumUtil.fromBase64(value);
	}

	/** @inheritDoc */
	protected async removeItemInternal (url: string, _WAIT_FOR_READY: boolean) : Promise<void> {
		await this.storage.remove({key: url});
	}

	/** @inheritDoc */
	protected async setItemInternal (
		url: string,
		value: Uint8Array,
		_WAIT_FOR_READY: boolean
	) : Promise<void> {
		await this.storage.set({
			key: url,
			value: potassiumUtil.toBase64(value)
		});
	}

	constructor () {
		super();
	}
}
