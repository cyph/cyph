import {Injectable} from '@angular/core';
import * as firebase from 'firebase';
import {env} from '../env';
import {util} from '../util';
import {DatabaseService} from './database.service';


/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService extends DatabaseService {
	/** @ignore */
	private app: Promise<firebase.app.App>	= this.retryUntilSuccessful(() =>
		firebase && (firebase.apps[0] || firebase.initializeApp(env.firebaseConfig))
	);

	/** @inheritDoc */
	public async getDatabaseRef (url: string) : Promise<firebase.database.Reference> {
		return this.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).database().refFromURL(url) :
				(await this.app).database().ref(url)
		);
	}

	/** @inheritDoc */
	public async getStorageRef (url: string) : Promise<firebase.storage.Reference> {
		return this.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).storage().refFromURL(url) :
				(await this.app).storage().ref(url)
		);
	}

	/** @inheritDoc */
	public async retryUntilSuccessful<T> (f: () => (T|Promise<T>)) : Promise<T> {
		return util.retryUntilSuccessful(async () => {
			try {
				localStorage.removeItem('firebase:previous_websocket_failure');
			}
			catch (_) {}

			return f();
		});
	}

	constructor () {
		super();
	}
}
