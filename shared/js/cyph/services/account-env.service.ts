import {Injectable} from '@angular/core';
import {env} from '../env';
import {EnvService} from './env.service';
import {LocalStorageService} from './local-storage.service';

/**
 * Replaces a subset of the env service for the accounts UI in certain cases.
 */
@Injectable()
export class AccountEnvService extends EnvService {
	/** @inheritDoc */
	public readonly isAccounts: boolean = true;

	/** @inheritDoc */
	public readonly pro = env.pro;

	/** @inheritDoc */
	public readonly telehealthTheme = env.telehealthTheme;

	constructor (localStorageService: LocalStorageService) {
		super(localStorageService);
	}
}
