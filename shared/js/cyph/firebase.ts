import {Env} from './env';
import {Util} from './util';


/**
 * Wraps the Firebase SDK.
 */
export class Firebase {
	/** Firebase app instance. */
	public static app: Promise<firebase.FirebaseApplication>	= (async () =>
		Util.retryUntilSuccessful(() =>
			firebase.apps[0] || firebase.initializeApp({
				apiKey: 'AIzaSyB7B8i8AQPtgMXS9o6zbfX1Vv-PwW2Q0Jo',
				authDomain: 'cyphme.firebaseapp.com',
				databaseURL: Env.firebaseEndpoint,
				storageBucket: 'cyphme.appspot.com'
			})
		)
	)();
}
