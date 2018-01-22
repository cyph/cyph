import {Injectable} from '@angular/core';
import {Potassium} from '../../crypto/potassium/potassium';
import {EnvService} from '../env.service';


/**
 * Potassium implementation that runs it on the current thread.
 */
@Injectable()
export class MainThreadPotassiumService extends Potassium {
	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return !!(
			this.envService.environment.customBuild &&
			this.envService.environment.customBuild.config.nativeCrypto
		);
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		super();
	}
}
