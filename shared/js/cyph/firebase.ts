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

		for (let i = 0 ; true ; ++i) {
			try {
				Firebase.app	= firebase.initializeApp({
					apiKey: 'AIzaSyB7B8i8AQPtgMXS9o6zbfX1Vv-PwW2Q0Jo',
					authDomain: 'cyphme.firebaseapp.com',
					databaseURL: Env.firebaseEndpoint,
					storageBucket: 'cyphme.appspot.com'
				});

				return;
			}
			catch (err) {
				if (i > 10) {
					throw new Error(`Firebase Error: ${err.message}`);
				}
				else {
					await Util.sleep(2500);
				}
			}
		}
	})();
}
