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
	public async getItem (key: string) : Promise<Uint8Array> {
		const value	= await this.storage.get({key});

		if (typeof value !== 'string') {
			throw new Error(`Item ${key} not found.`);
		}

		return potassiumUtil.fromString(value);
	}

	/** @inheritDoc */
	public async removeItem (key: string) : Promise<void> {
		await this.getItem(key);
		await this.storage.remove({key});
	}

	/** @inheritDoc */
	public async setItem (key: string, value: DataType) : Promise<string> {
		await this.storage.set({key, value: potassiumUtil.toString(await util.toBytes(value))});
		return key;
	}

	constructor () {
		super();
	}
}
