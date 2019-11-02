import {Injectable} from '@angular/core';
import {Config} from '../config';
import {planConfig} from '../plan-config';

/**
 * @see Config
 */
@Injectable()
export class ConfigService extends Config {
	/** @see planConfig */
	public readonly planConfig = planConfig;

	constructor () {
		super();
	}
}
