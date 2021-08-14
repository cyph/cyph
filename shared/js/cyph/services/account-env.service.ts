import {Injectable} from '@angular/core';
import {env} from '../env';
import {EnvService} from './env.service';

/**
 * Replaces a subset of the env service for the accounts UI.
 */
@Injectable()
export class AccountEnvService extends EnvService {
	/** @inheritDoc */
	public readonly isAccounts: boolean = true;

	/** @inheritDoc */
	public readonly pro = env.pro;

	/** @inheritDoc */
	public readonly telehealthTheme = env.telehealthTheme;

	constructor () {
		super();
	}
}
