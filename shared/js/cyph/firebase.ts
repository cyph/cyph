import {Env} from './env';
import {Util} from './util';


/**
 * Wraps the Firebase SDK.
 */
export class Firebase {
	/** Firebase app instance. */
	public static app: firebase.FirebaseApplication;

	/** @ignore */
	/* tslint:disable-next-line:member-ordering */
	public static readonly _	= (async () => {
		for (let i = 0 ; typeof firebase === 'undefined' ; ++i) {
			if (i < 2) {
				await Util.sleep();
			}
			else {
				return;
			}
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
