import * as firebase from 'firebase';
import {env} from './env';
import {util} from './util';


/** Firebase app instance. */
export const firebaseApp: Promise<firebase.FirebaseApplication>	= (async () =>
	util.retryUntilSuccessful(() =>
		firebase.apps[0] || firebase.initializeApp({
			apiKey: 'AIzaSyB7B8i8AQPtgMXS9o6zbfX1Vv-PwW2Q0Jo',
			authDomain: 'cyphme.firebaseapp.com',
			databaseURL: env.firebaseEndpoint,
			storageBucket: 'cyphme.appspot.com'
		})
	)
)();
