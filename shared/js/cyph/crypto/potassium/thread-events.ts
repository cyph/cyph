/**
 * Strings used as event names for wrapping Potassium in a thread.
 */
export class ThreadEvents {
	/** @see IBox */
	public readonly box	= {
		keyPair: `${this.eventID}.box.keyPair`,
		open: `${this.eventID}.box.open`,
		privateKeyBytes: `${this.eventID}.box.privateKeyBytes`,
		publicKeyBytes: `${this.eventID}.box.publicKeyBytes`,
		seal: `${this.eventID}.box.seal`
	};

	/** @see IEphemeralKeyExchange */
	public readonly ephemeralKeyExchange	= {
		aliceKeyPair: `${this.eventID}.ephemeralKeyExchange.aliceKeyPair`,
		aliceSecret: `${this.eventID}.ephemeralKeyExchange.aliceSecret`,
		bobSecret: `${this.eventID}.ephemeralKeyExchange.bobSecret`,
		privateKeyBytes: `${this.eventID}.ephemeralKeyExchange.privateKeyBytes`,
		publicKeyBytes: `${this.eventID}.ephemeralKeyExchange.publicKeyBytes`,
		secretBytes: `${this.eventID}.ephemeralKeyExchange.secretBytes`
	};

	/** @see IHash */
	public readonly hash	= {
		bytes: `${this.eventID}.hash.bytes`,
		deriveKey: `${this.eventID}.hash.deriveKey`,
		hash: `${this.eventID}.hash.hash`
	};

	/** @see IOneTimeAuth */
	public readonly oneTimeAuth	= {
		bytes: `${this.eventID}.oneTimeAuth.bytes`,
		keyBytes: `${this.eventID}.oneTimeAuth.keyBytes`,
		sign: `${this.eventID}.oneTimeAuth.sign`,
		verify: `${this.eventID}.oneTimeAuth.verify`
	};

	/** @see IPasswordHash */
	public readonly passwordHash	= {
		algorithm: `${this.eventID}.passwordHash.algorithm`,
		hash: `${this.eventID}.passwordHash.hash`,
		memLimitInteractive: `${this.eventID}.passwordHash.memLimitInteractive`,
		memLimitSensitive: `${this.eventID}.passwordHash.memLimitSensitive`,
		opsLimitInteractive: `${this.eventID}.passwordHash.opsLimitInteractive`,
		opsLimitSensitive: `${this.eventID}.passwordHash.opsLimitSensitive`,
		parseMetadata: `${this.eventID}.passwordHash.parseMetadata`,
		saltBytes: `${this.eventID}.passwordHash.saltBytes`
	};

	/** @see ISecretBox */
	public readonly secretBox	= {
		aeadBytes: `${this.eventID}.secretBox.aeadBytes`,
		keyBytes: `${this.eventID}.secretBox.keyBytes`,
		open: `${this.eventID}.secretBox.open`,
		seal: `${this.eventID}.secretBox.seal`
	};

	/** @see ISign */
	public readonly sign	= {
		bytes: `${this.eventID}.sign.bytes`,
		importSuperSphincsPublicKeys: `${this.eventID}.sign.importSuperSphincsPublicKeys`,
		keyPair: `${this.eventID}.sign.keyPair`,
		open: `${this.eventID}.sign.open`,
		privateKeyBytes: `${this.eventID}.sign.privateKeyBytes`,
		publicKeyBytes: `${this.eventID}.sign.publicKeyBytes`,
		sign: `${this.eventID}.sign.sign`,
		signDetached: `${this.eventID}.sign.signDetached`,
		verifyDetached: `${this.eventID}.sign.verifyDetached`
	};

	constructor (
		/** @ignore */
		private readonly eventID: string
	) {}
}
