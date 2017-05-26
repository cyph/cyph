/* tslint:disable:no-import-side-effect */

import {Injectable} from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';
import {env} from '../env';
import {util} from '../util';
import {DatabaseService} from './database.service';


/**
 * DatabaseService implementation built on Firebase.
 */
@Injectable()
export class FirebaseDatabaseService implements DatabaseService {
	/** @ignore */
	private app: Promise<firebase.app.App>	= util.retryUntilSuccessful(() => {
		try {
			for (const key of Object.keys(localStorage).filter(k => k.startsWith('firebase:'))) {
				/* tslint:disable-next-line:ban */
				localStorage.removeItem(key);
			}
		}
		catch (_) {}

		return firebase.apps[0] || firebase.initializeApp(env.firebaseConfig);
	});

	/** @ignore */
	private usernameToEmail (username: string) : string {
		return `${username}@cyph.me`;
	}

	/** @inheritDoc */
	public async getDatabaseRef (url: string) : Promise<firebase.database.Reference> {
		return util.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).database().refFromURL(url) :
				(await this.app).database().ref(url)
		);
	}

	/** @inheritDoc */
	public async getDatabaseValue<T> (url: string) : Promise<T|undefined> {
		const value	= (await (await this.getDatabaseRef(url)).once('value')).val();

		/* tslint:disable-next-line:no-null-keyword */
		if (value !== null) {
			return value;
		}
		else {
			return undefined;
		}
	}

	/** @inheritDoc */
	public async getStorageRef (url: string) : Promise<firebase.storage.Reference> {
		return util.retryUntilSuccessful(async () =>
			/^https?:\/\//.test(url) ?
				(await this.app).storage().refFromURL(url) :
				(await this.app).storage().ref(url)
		);
	}

	/** @inheritDoc */
	public async login (username: string, password: string) : Promise<void> {
		await (await this.app).auth().signInWithEmailAndPassword(
			this.usernameToEmail(username),
			password
		);
	}

	/** @inheritDoc */
	public async logout () : Promise<void> {
		await util.retryUntilSuccessful(async () =>
			(await this.app).auth().signOut()
		);
	}

	/** @inheritDoc */
	public async register (username: string, password: string) : Promise<void> {
		await (await this.app).auth().createUserWithEmailAndPassword(
			this.usernameToEmail(username),
			password
		);
	}

	constructor () {}
}
