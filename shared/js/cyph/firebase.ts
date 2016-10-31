import {Env} from './env';
import {Util} from './util';


/**
 * Wraps the Firebase SDK.
 */
export class Firebase {
	public static app: firebase.FirebaseApplication;

	private static _	= (async () => {
		if (!self['firebase']) {
			return;
		}

		Firebase.app	= await Util.retryUntilSuccessful(() =>
			firebase.initializeApp({
				apiKey: 'AIzaSyB7B8i8AQPtgMXS9o6zbfX1Vv-PwW2Q0Jo',
				authDomain: 'cyphme.firebaseapp.com',
				databaseURL: Env.firebaseEndpoint,
				storageBucket: 'cyphme.appspot.com'
			})
		);
	})();
}
