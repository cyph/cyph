import * as firebase from 'firebase';
import {env} from './env';
import {util} from './util';


/** Firebase app instance. */
export const firebaseApp: Promise<firebase.app.App>	= (async () =>
	util.retryUntilSuccessful(() =>
		firebase.apps[0] || firebase.initializeApp(env.firebaseConfig)
	)
)();
