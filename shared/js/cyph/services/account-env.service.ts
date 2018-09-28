import {Injectable} from '@angular/core';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';


/**
 * Replaces a subset of the env service for the accounts UI in certain cases.
 */
@Injectable()
export class AccountEnvService extends EnvService {
	/** @inheritDoc */
	public readonly chatVirtualScroll: boolean	= true;

	/** @inheritDoc */
	public readonly isAccounts: boolean			= true;

	constructor (
		localStorageService: LocalStorageService
	) {
		super(localStorageService);
	}
}
