/**
 * Strings used as event names for wrapping Potassium in a thread.
 */
export class ThreadEvents {
	/** @see IBox */
	public readonly box	= {
		keyPair: `${this.eventId}.box.keyPair`,
		open: `${this.eventId}.box.open`,
		privateKeyBytes: `${this.eventId}.box.privateKeyBytes`,
		publicKeyBytes: `${this.eventId}.box.publicKeyBytes`,
		seal: `${this.eventId}.box.seal`
	};

	/** @see IEphemeralKeyExchange */
	public readonly ephemeralKeyExchange	= {
		aliceKeyPair: `${this.eventId}.ephemeralKeyExchange.aliceKeyPair`,
		aliceSecret: `${this.eventId}.ephemeralKeyExchange.aliceSecret`,
		bobSecret: `${this.eventId}.ephemeralKeyExchange.bobSecret`,
		privateKeyBytes: `${this.eventId}.ephemeralKeyExchange.privateKeyBytes`,
		publicKeyBytes: `${this.eventId}.ephemeralKeyExchange.publicKeyBytes`,
		secretBytes: `${this.eventId}.ephemeralKeyExchange.secretBytes`
	};

	/** @see IHash */
	public readonly hash	= {
		bytes: `${this.eventId}.hash.bytes`,
		deriveKey: `${this.eventId}.hash.deriveKey`,
		hash: `${this.eventId}.hash.hash`
	};

	/** @see IOneTimeAuth */
	public readonly oneTimeAuth	= {
		bytes: `${this.eventId}.oneTimeAuth.bytes`,
		keyBytes: `${this.eventId}.oneTimeAuth.keyBytes`,
		sign: `${this.eventId}.oneTimeAuth.sign`,
		verify: `${this.eventId}.oneTimeAuth.verify`
	};

	/** @see IPasswordHash */
	public readonly passwordHash	= {
		algorithm: `${this.eventId}.passwordHash.algorithm`,
		hash: `${this.eventId}.passwordHash.hash`,
		memLimitInteractive: `${this.eventId}.passwordHash.memLimitInteractive`,
		memLimitSensitive: `${this.eventId}.passwordHash.memLimitSensitive`,
		opsLimitInteractive: `${this.eventId}.passwordHash.opsLimitInteractive`,
		opsLimitSensitive: `${this.eventId}.passwordHash.opsLimitSensitive`,
		parseMetadata: `${this.eventId}.passwordHash.parseMetadata`,
		saltBytes: `${this.eventId}.passwordHash.saltBytes`
	};

	/** @see ISecretBox */
	public readonly secretBox	= {
		aeadBytes: `${this.eventId}.secretBox.aeadBytes`,
		keyBytes: `${this.eventId}.secretBox.keyBytes`,
		open: `${this.eventId}.secretBox.open`,
		seal: `${this.eventId}.secretBox.seal`
	};

	/** @see ISign */
	public readonly sign	= {
		bytes: `${this.eventId}.sign.bytes`,
		importSuperSphincsPublicKeys: `${this.eventId}.sign.importSuperSphincsPublicKeys`,
		keyPair: `${this.eventId}.sign.keyPair`,
		open: `${this.eventId}.sign.open`,
		privateKeyBytes: `${this.eventId}.sign.privateKeyBytes`,
		publicKeyBytes: `${this.eventId}.sign.publicKeyBytes`,
		sign: `${this.eventId}.sign.sign`,
		signDetached: `${this.eventId}.sign.signDetached`,
		verifyDetached: `${this.eventId}.sign.verifyDetached`
	};

	constructor (
		/** @ignore */
		private readonly eventId: string
	) {}
}
