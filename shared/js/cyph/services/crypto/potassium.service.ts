import {Injectable} from '@angular/core';
import {IPotassium} from '../../crypto/potassium/ipotassium';
import {PotassiumUtil} from '../../crypto/potassium/potassium-util';


/**
 * @see IPotassium
 */
@Injectable()
export abstract class PotassiumService extends PotassiumUtil implements IPotassium {
	/** @inheritDoc */
	public readonly box: any;

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: any;

	/** @inheritDoc */
	public readonly hash: any;

	/** @inheritDoc */
	public readonly oneTimeAuth: any;

	/** @inheritDoc */
	public readonly passwordHash: any;

	/** @inheritDoc */
	public readonly secretBox: any;

	/** @inheritDoc */
	public readonly sign: any;

	/** @inheritDoc */
	public async native () : Promise<boolean> {
		throw new Error('Must provide an implementation of PotassiumService.native.');
	}

	constructor () {
		super();
	}
}
