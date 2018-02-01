import {oneTimeAuth} from './native-crypto/one-time-auth';
import {potassiumUtil} from './potassium-util';


/** @see IPotassium.isNativeCryptoSupported */
export const isNativeCryptoSupported	= async () : Promise<boolean> => {
	try {
		await oneTimeAuth.sign(
			potassiumUtil.randomBytes(1),
			potassiumUtil.randomBytes(oneTimeAuth.keyBytes)
		);
		return true;
	}
	catch {
		return false;
	}
};
