import {secretBox as nativeSecretBox} from './native-crypto/secret-box';
import {potassiumUtil} from './potassium-util';


/** @see IPotassium.isNativeCryptoSupported */
export const isNativeCryptoSupported	= async () : Promise<boolean> => {
	try {
		await nativeSecretBox.seal(
			potassiumUtil.randomBytes(1),
			potassiumUtil.randomBytes(nativeSecretBox.nonceBytes),
			potassiumUtil.randomBytes(nativeSecretBox.keyBytes)
		);
		return true;
	}
	catch {
		return false;
	}
};
