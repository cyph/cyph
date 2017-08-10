import {Injectable} from '@angular/core';
import {IBox} from '../../crypto/potassium/ibox';
import {IEphemeralKeyExchange} from '../../crypto/potassium/iephemeral-key-exchange';
import {IHash} from '../../crypto/potassium/ihash';
import {IOneTimeAuth} from '../../crypto/potassium/ione-time-auth';
import {IPasswordHash} from '../../crypto/potassium/ipassword-hash';
import {IPotassium} from '../../crypto/potassium/ipotassium';
import {ISecretBox} from '../../crypto/potassium/isecret-box';
import {ISign} from '../../crypto/potassium/isign';
import {PotassiumUtil} from '../../crypto/potassium/potassium-util';


/**
 * @see IPotassium
 */
@Injectable()
export class PotassiumService extends PotassiumUtil implements IPotassium {
	/** @inheritDoc */
	public readonly box: IBox;

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange;

	/** @inheritDoc */
	public readonly hash: IHash;

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth;

	/** @inheritDoc */
	public readonly passwordHash: IPasswordHash;

	/** @inheritDoc */
	public readonly secretBox: ISecretBox;

	/** @inheritDoc */
	public readonly sign: ISign;

	/** @inheritDoc */
	public async isNativeCryptoSupported () : Promise<boolean> {
		throw new Error(
			'Must provide an implementation of PotassiumService.isNativeCryptoSupported.'
		);
	}

	/** @inheritDoc */
	public async native () : Promise<boolean> {
		throw new Error('Must provide an implementation of PotassiumService.native.');
	}

	constructor () {
		super();
	}
}
