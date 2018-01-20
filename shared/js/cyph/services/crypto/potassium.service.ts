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
	/** @ignore */
	private readonly errorFunction: () => Promise<never>	= async () => this.errorValue;

	/** @ignore */
	private readonly errorValue: Promise<never>	= Promise.reject(
		'Must provide an implementation of PotassiumService'
	);

	/** @inheritDoc */
	public readonly box: IBox	= {
		privateKeyBytes: this.errorValue,
		publicKeyBytes: this.errorValue,
		keyPair: this.errorFunction,
		open: this.errorFunction,
		seal: this.errorFunction
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange	= {
		privateKeyBytes: this.errorValue,
		publicKeyBytes: this.errorValue,
		secretBytes: this.errorValue,
		aliceKeyPair: this.errorFunction,
		aliceSecret: this.errorFunction,
		bobSecret: this.errorFunction
	};

	/** @inheritDoc */
	public readonly hash: IHash	= {
		bytes: this.errorValue,
		deriveKey: this.errorFunction,
		hash: this.errorFunction
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth	= {
		bytes: this.errorValue,
		keyBytes: this.errorValue,
		sign: this.errorFunction,
		verify: this.errorFunction
	};

	/** @inheritDoc */
	public readonly passwordHash: IPasswordHash	= {
		algorithm: this.errorValue,
		memLimitInteractive: this.errorValue,
		memLimitSensitive: this.errorValue,
		opsLimitInteractive: this.errorValue,
		opsLimitSensitive: this.errorValue,
		saltBytes: this.errorValue,
		hash: this.errorFunction,
		parseMetadata: this.errorFunction
	};

	/** @inheritDoc */
	public readonly secretBox: ISecretBox	= {
		aeadBytes: this.errorValue,
		keyBytes: this.errorValue,
		open: this.errorFunction,
		seal: this.errorFunction
	};

	/** @inheritDoc */
	public readonly sign: ISign	= {
		bytes: this.errorValue,
		privateKeyBytes: this.errorValue,
		publicKeyBytes: this.errorValue,
		importSuperSphincsPublicKeys: this.errorFunction,
		keyPair: this.errorFunction,
		open: this.errorFunction,
		sign: this.errorFunction,
		signDetached: this.errorFunction,
		verifyDetached: this.errorFunction
	};

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
