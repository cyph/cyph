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
import {EnvService} from '../env.service';

/**
 * @see IPotassium
 */
@Injectable()
export class PotassiumService extends PotassiumUtil implements IPotassium {
	/** @ignore */
	private readonly errorValue: Promise<never> = Promise.reject(
		'Must provide an implementation of PotassiumService'
	);

	/** @inheritDoc */
	public readonly box: IBox = {
		currentAlgorithm: this.errorValue,
		getPrivateKeyBytes: async () => this.errorValue,
		getPublicKeyBytes: async () => this.errorValue,
		keyPair: async () => this.errorValue,
		open: async () => this.errorValue,
		seal: async () => this.errorValue
	};

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: IEphemeralKeyExchange = {
		aliceKeyPair: async () => this.errorValue,
		aliceSecret: async () => this.errorValue,
		bobSecret: async () => this.errorValue,
		currentAlgorithm: this.errorValue,
		getPrivateKeyBytes: async () => this.errorValue,
		getPublicKeyBytes: async () => this.errorValue,
		getSecretBytes: async () => this.errorValue
	};

	/** @inheritDoc */
	public readonly hash: IHash = {
		bytes: this.errorValue,
		deriveKey: async () => this.errorValue,
		hash: async () => this.errorValue
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: IOneTimeAuth = {
		currentAlgorithm: this.errorValue,
		generateKey: async () => this.errorValue,
		getBytes: async () => this.errorValue,
		getKeyBytes: async () => this.errorValue,
		sign: async () => this.errorValue,
		verify: async () => this.errorValue
	};

	/** @inheritDoc */
	public readonly passwordHash: IPasswordHash = {
		algorithm: this.errorValue,
		hash: async () => this.errorValue,
		memLimitInteractive: this.errorValue,
		memLimitSensitive: this.errorValue,
		opsLimitInteractive: this.errorValue,
		opsLimitSensitive: this.errorValue,
		parseMetadata: async () => this.errorValue,
		saltBytes: this.errorValue
	};

	/** @inheritDoc */
	public readonly secretBox: ISecretBox = {
		currentAlgorithm: this.errorValue,
		generateKey: async () => this.errorValue,
		getAeadBytes: async () => this.errorValue,
		getKeyBytes: async () => this.errorValue,
		open: async () => this.errorValue,
		seal: async () => this.errorValue
	};

	/** @inheritDoc */
	public readonly sign: ISign = {
		currentAlgorithm: this.errorValue,
		getBytes: async () => this.errorValue,
		getPrivateKeyBytes: async () => this.errorValue,
		getPublicKeyBytes: async () => this.errorValue,
		importPublicKeys: async () => this.errorValue,
		keyPair: async () => this.errorValue,
		open: async () => this.errorValue,
		sign: async () => this.errorValue,
		signDetached: async () => this.errorValue,
		verifyDetached: async () => this.errorValue
	};

	/** @inheritDoc */
	/* eslint-disable-next-line @typescript-eslint/require-await */
	public async isNativeCryptoSupported () : Promise<boolean> {
		throw new Error(
			'Must provide an implementation of PotassiumService.isNativeCryptoSupported.'
		);
	}

	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return !!this.envService.environment.customBuild?.config.nativeCrypto;
	}

	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		super();
	}
}
