import {Injectable} from '@angular/core';
import {IPotassium} from '../cyph/crypto/potassium/ipotassium';
import {
	PotassiumUtil,
	potassiumUtil
} from '../cyph/crypto/potassium/potassium-util';

/**
 * Mocks the secret box subset of Potassium (for file transfers).
 */
@Injectable()
export class MockPotassiumService extends PotassiumUtil implements IPotassium {
	/** @inheritDoc */
	public readonly box: any;

	/** @inheritDoc */
	public readonly ephemeralKeyExchange: any;

	/** @inheritDoc */
	public readonly hash = {
		bytes: Promise.resolve(1),
		deriveKey: async (
			input: Uint8Array | string,
			_OUTPUT_BYTES?: number,
			_CLEAR_INPUT?: boolean
		) => new Uint8Array(potassiumUtil.fromString(input)),
		hash: async (plaintext: Uint8Array | string) =>
			new Uint8Array(potassiumUtil.fromString(plaintext))
	};

	/** @inheritDoc */
	public readonly oneTimeAuth: any;

	/** @inheritDoc */
	public readonly passwordHash: any;

	/** @inheritDoc */
	public readonly secretBox = {
		aeadBytes: Promise.resolve(1),
		keyBytes: Promise.resolve(1),
		open: async (
			cyphertext: Uint8Array,
			_KEY: Uint8Array,
			_ADDITIONAL_DATA?: Uint8Array
		) => new Uint8Array(cyphertext),
		seal: async (
			plaintext: Uint8Array,
			_KEY: Uint8Array,
			_ADDITIONAL_DATA?: Uint8Array
		) => new Uint8Array(plaintext)
	};

	/** @inheritDoc */
	public readonly sign: any;

	/** @inheritDoc */
	public async isNativeCryptoSupported () : Promise<boolean> {
		return false;
	}

	/** @inheritDoc */
	public async native () : Promise<boolean> {
		return false;
	}

	constructor () {
		super();
	}
}
