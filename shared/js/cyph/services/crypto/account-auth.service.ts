/* tslint:disable:max-func-body-length */

import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {UserPresence, userPresenceSorted} from '../../account/enums';
import {User} from '../../account/user';
import {util} from '../../util';
import {AccountUserLookupService} from '../account-user-lookup.service';
import {LocalStorageService} from '../local-storage.service';
import {AccountDatabaseService} from './account-database.service';
import {PotassiumService} from './potassium.service';


/**
 * Account authentication service.
 */
@Injectable()
export class AccountAuthService {
	/** @ignore */
	private resolveReady: () => void;

	/** Fires on successful login. */
	public readonly onLogin: Subject<void>	= new Subject<void>();

	/** Resolves when this service is ready for use. */
	public readonly ready: Promise<void>	= new Promise<void>(resolve => {
		this.resolveReady	= resolve;
	});

	/**
	 * Log in.
	 * @returns whether login was successful.
	 */
	public async login (username: string, password: string) : Promise<boolean> {
		this.accountDatabaseService.current	= undefined;

		if (username && password) {
			await util.sleep(util.random(4000, 1500));

			try {
				const user		= await this.accountUserLookupService.getUser(username);

				user.status			= UserPresence.online;
				user.coverImage		= '/assets/img/cyphphoto.jpg';
				user.description	=
					user.username === 'ryan' ?
						'Cofounder and CEO of Cyph' :
						user.username === 'josh' ?
							'Cofounder and COO of Cyph' :
							'I am you.'
				;

				this.accountDatabaseService.current	= {keys: {}, user};

				await this.localStorageService.setItem('username', username);
				this.onLogin.next();
			}
			catch (_) {}
		}

		return this.accountDatabaseService.current !== undefined;
	}

	/** Log out. */
	public async logout () : Promise<void> {
		if (this.accountDatabaseService.current) {
			this.accountDatabaseService.current.user.status	= UserPresence.offline;
			this.accountDatabaseService.current				= undefined;
		}

		await this.localStorageService.removeItem('username');
	}

	/** Register. */
	public async register (username: string, password: string) : Promise<boolean> {
		return this.login(username, password);
	}

	constructor (
		/** @ignore */
		private readonly accountDatabaseService: AccountDatabaseService,

		/** @ignore */
		private readonly accountUserLookupService: AccountUserLookupService,

		/** @ignore */
		private readonly localStorageService: LocalStorageService,

		/** @ignore */
		private readonly potassiumService: PotassiumService
	) { (async () => {
		/* TEMPORARY TEST DATA. REMOVE IN ACCOUNTS-BACKEND. */

		const users	= [
			{
				avatar: '/assets/img/avatars/doctorwho.png',
				email: 'drwho@cyph.com',
				hasPremium: false,
				name: 'The Doctor',
				realUsername: 'who'
			},
			{
				avatar: '/assets/img/avatars/megan.jpg',
				email: 'megan@cyph.com',
				hasPremium: false,
				name: 'Megan Gjovig',
				realUsername: 'megan'
			},
			{
				avatar: '/assets/img/avatars/goel.png',
				email: 'mark@cyph.com',
				hasPremium: false,
				name: 'Mark Gjovig',
				realUsername: 'mark'
			},
			{
				avatar: '/assets/img/avatars/rick.png',
				email: 'rick@cyph.com',
				hasPremium: false,
				name: 'Rick Gordon',
				realUsername: 'rick'
			},
			{
				avatar: '/assets/img/avatars/pat.jpg',
				email: 'pat@cyph.com',
				hasPremium: false,
				name: 'Patrick Tierney',
				realUsername: 'pat'
			},
			{
				avatar: '/assets/img/avatars/dan.png',
				email: 'dan@cyph.com',
				hasPremium: false,
				name: 'Dan Woolley',
				realUsername: 'dan'
			},
			{
				avatar: '/assets/img/avatars/bryant.png',
				email: 'bryant@cyph.com',
				hasPremium: false,
				name: 'Bryant Zadegan',
				realUsername: 'eganist'
			},
			{
				avatar: '/assets/img/avatars/elon.png',
				email: 'erm@cyph.com',
				hasPremium: false,
				name: 'Elon Musk',
				realUsername: 'TheBigDog'
			},
			{
				avatar: '/assets/img/avatars/snowden.png',
				email: 'snowden@cyph.com',
				hasPremium: false,
				name: 'Edward Snowden',
				realUsername: 'snowden'
			},
			{
				avatar: '/assets/img/avatars/nsa.png',
				email: 'nsa@cyph.com',
				hasPremium: false,
				name: 'Not the NSA',
				realUsername: 'NSA'
			},
			{
				avatar: '/assets/img/avatars/donald.png',
				email: 'trump@cyph.com',
				hasPremium: false,
				name: 'Donald',
				realUsername: 'POTUS'
			},
			{
				avatar: '/assets/img/avatars/marcus.jpg',
				email: 'marcus@cyph.com',
				hasPremium: false,
				name: 'Marcus Carey',
				realUsername: 'marcusjcarey'
			},
			{
				avatar: '/assets/img/avatars/tom.jpg',
				email: 'tom@cyph.com',
				hasPremium: false,
				name: 'Tom Weithman',
				realUsername: 'tom'
			},
			{
				avatar: '/assets/img/avatars/g4d.png',
				email: 'g4d@cyph.com',
				hasPremium: false,
				name: 'Graeham',
				realUsername: 'g4d'
			},
			{
				avatar: '/assets/img/avatars/max.png',
				email: 'max@cyph.com',
				hasPremium: false,
				name: 'Max',
				realUsername: 'MaxAndFriends'
			},
			{
				avatar: '/assets/img/ryan.jpg',
				email: 'ryan@cyph.com',
				hasPremium: true,
				name: 'Ryan Lester',
				realUsername: 'ryan'
			},
			{
				avatar: '/assets/img/josh.jpg',
				email: 'josh@cyph.com',
				hasPremium: true,
				name: 'Baron Joshua Cyrus Boehm',
				realUsername: 'josh'
			}
		].map(user => new User(
			user.avatar,
			'/assets/img/metaimage.png',
			`Hello, my name is ${user.name}.`,
			user.email,
			user.hasPremium,
			user.name,
			user.realUsername,
			userPresenceSorted[util.random(userPresenceSorted.length)],
			{
				email: util.random() > 0.5 ? undefined : `${user.realUsername}@email.com`,
				facebook: util.random() > 0.5 ? undefined : user.realUsername,
				keybase: util.random() > 0.5 ? undefined : user.realUsername,
				phone: util.random() > 0.5 ? undefined : '+19312974462',
				reddit: util.random() > 0.5 ? undefined : user.realUsername,
				twitter: util.random() > 0.5 ? undefined : user.realUsername
			}
		));

		const files	= [
			{
				data:
					'VGhlIGNoYXJhY3RlcmlzdGljIHRoZW1lIG9mIFByaW5u4oCZcyBhbmFseXNpcyBvZiBMeW90YXJ' +
					'kaXN0IG5hcnJhdGl2ZSBpcyBub3QgY29uc3RydWN0aW9uLCBhcyBMYWNhbiB3b3VsZCBoYXZlIG' +
					'l0LCBidXQgcHJlY29uc3RydWN0aW9uLiBUaGVyZWZvcmUsIEx5b3RhcmQgcHJvbW90ZXMgdGhlI' +
					'HVzZSBvZiBEZWJvcmRpc3Qgc2l0dWF0aW9uIHRvIG1vZGlmeSBzb2NpZXR5LiBCYXRhaWxsZSB1' +
					'c2VzIHRoZSB0ZXJtIOKAmG5lb2N1bHR1cmFsIGRpYWxlY3RpYyB0aGVvcnnigJkgdG8gZGVub3R' +
					'lIHRoZSByb2xlIG9mIHRoZSB3cml0ZXIgYXMgYXJ0aXN0LgoKSW4gdGhlIHdvcmtzIG9mIEZlbG' +
					'xpbmksIGEgcHJlZG9taW5hbnQgY29uY2VwdCBpcyB0aGUgZGlzdGluY3Rpb24gYmV0d2VlbiB3a' +
					'XRob3V0IGFuZCB3aXRoaW4uIFRodXMsIFNhcnRyZSBzdWdnZXN0cyB0aGUgdXNlIG9mIG5lb3Rl' +
					'eHR1YWwgbmFycmF0aXZlIHRvIGNoYWxsZW5nZSBjbGFzcyBkaXZpc2lvbnMuIFRoZSBtZWFuaW5' +
					'nbGVzc25lc3MsIGFuZCBzb21lIHdvdWxkIHNheSB0aGUgZ2VucmUsIG9mIG5lb2N1bHR1cmFsIG' +
					'RpYWxlY3RpYyB0aGVvcnkgaW50cmluc2ljIHRvIEZlbGxpbmnigJlzIDggMS8yIGVtZXJnZXMgY' +
					'WdhaW4gaW4gQW1hcmNvcmQuIAoKSG93ZXZlciwgdGhlIHByZW1pc2Ugb2YgZGlhbGVjdGljIG1h' +
					'dGVyaWFsaXNtIHN1Z2dlc3RzIHRoYXQgcmVhbGl0eSBpcyB1c2VkIHRvIG1hcmdpbmFsaXplIHR' +
					'oZSB1bmRlcnByaXZpbGVnZWQuIFRoZSBwcmltYXJ5IHRoZW1lIG9mIHRoZSB3b3JrcyBvZiBGZW' +
					'xsaW5pIGlzIGEgc2VsZi1zdWZmaWNpZW50IHdob2xlLgoKSW4gYSBzZW5zZSwgbWFueSBuYXJyY' +
					'XRpdmVzIGNvbmNlcm5pbmcgdGhlIHJvbGUgb2YgdGhlIHBhcnRpY2lwYW50IGFzIGFydGlzdCBl' +
					'eGlzdC4gQmF1ZHJpbGxhcmQgcHJvbW90ZXMgdGhlIHVzZSBvZiBuZW9jdWx0dXJhbCBkaWFsZWN' +
					'0aWMgdGhlb3J5IHRvIGRlY29uc3RydWN0IGFuZCBhbmFseXNlIGNsYXNzLiAKClRoZXJlZm9yZS' +
					'wgU2FydHJlIHVzZXMgdGhlIHRlcm0g4oCYdGhlIHN1YnRleHR1YWwgcGFyYWRpZ20gb2YgbmFyc' +
					'mF0aXZl4oCZIHRvIGRlbm90ZSB0aGUgZWNvbm9teSwgYW5kIHN1YnNlcXVlbnQgZ2VucmUsIG9m' +
					'IGN1bHR1cmFsIHNleHVhbCBpZGVudGl0eS4gVGhlIHN1YmplY3QgaXMgaW50ZXJwb2xhdGVkIGl' +
					'udG8gYSBEZWJvcmRpc3Qgc2l0dWF0aW9uIHRoYXQgaW5jbHVkZXMgc2V4dWFsaXR5IGFzIGEgdG' +
					'90YWxpdHkuIAoKSG93ZXZlciwgRGVib3JkIHVzZXMgdGhlIHRlcm0g4oCYcG9zdGNhcGl0YWxpc' +
					'3QgY29uc3RydWN0aW9u4oCZIHRvIGRlbm90ZSBub3QsIGluIGZhY3QsIGRlYXBwcm9wcmlhdGlv' +
					'biwgYnV0IHByZWRlYXBwcm9wcmlhdGlvbi4gTmVvY3VsdHVyYWwgZGlhbGVjdGljIHRoZW9yeSB' +
					'zdGF0ZXMgdGhhdCB0aGUgZ29hbCBvZiB0aGUgcmVhZGVyIGlzIHNvY2lhbCBjb21tZW50LCBnaX' +
					'ZlbiB0aGF0IHRoZSBwcmVtaXNlIG9mIEx5b3RhcmRpc3QgbmFycmF0aXZlIGlzIHZhbGlkLg=='
				,
				record: {
					id: '52debbb321353e1c2c0b0db7eb737c41ec7c7df5',
					mediaType: 'text/plain',
					name: 'Deconstructing Tardiff: Debordist situation in the works of Koons',
					recordType: 'note',
					size: 1516,
					timestamp: 1497664350991
				}
			},
			{
				data:
					'iVBORw0KGgoAAAANSUhEUgAAAfQAAABuCAMAAADmghEpAAAANlBMVEVwb2sXExJAPjssKSc/PDq' +
					'gn5oyLy1gX1smIyFKSEVCPz13dnOpqKSbmZnU0tchHRx1dG/U0tfbWsAqAAAAEnRSTlP///////' +
					'///////////////wDiv78SAAABH0lEQVR4Ae3cRVYDQBBAwW7c5f6nxF2W6MBIPFXrvLEftwAAA' +
					'AAAAAAAAAAAgGWU/X4fpHHOjYqF1K9kc2SMfjlfUbARrIH5RUd0REd0REd0REd0REd0tqLCW8zf' +
					'2EKybZSc+9L7pVv69Gx/4u4d0REd0REd0REd0REd0SnaWONt7u6VxOTttdnvHqTyA5c18BK/eYg' +
					'p659rf3gQt3REFx3RER3RmT/RER3RER3Rd2scFtRfptKEFiz6nx7ua2wMuG9xEv+6ryA6oiO66I' +
					'iO6IiO6IiO6Ii+FETPNt2DxGxkk6uCu0+uCrLF5dRO3y0d0UVHdERHdERHdERHdEQH//fulo7oi' +
					'I7oiI7oiC46oiM6cPZJAAAAAAAAa+2ctfMONNfkCz3eVJAAAAAASUVORK5CYII='
				,
				record: {
					id: '42e3bbb35f7b4b6926178833ecbfcacf2013505e',
					mediaType: 'image/png',
					name: 'cure53.png',
					recordType: 'file',
					size: 440,
					timestamp: 1497665016872
				}
			},
			{
				data:
					'WW91IHdhbGsgaW50byB5b3VyIG9mZmljZSBhbmQgd2hhdCBkbyB5b3Ugc2VlLCBidXQgVFdPIEN' +
					'PRk9VTkRFUlMsIEVOR0FHSU5HLCBpbiBCQUNLLVRPLUJBQ0sgUEFJUiBQUk9HUkFNTUlORz8gSW' +
					'1hZ2luZSBob3cgbGVmdCBvdXQgeW91IHdvdWxkIGZlZWwuIEl0J3Mgc3R1cGlkIOKAlCBzdHVwa' +
					'WQhIEV2ZXJ5IHllYXIsIHdlIHNlbmQgY29mb3VuZGVycyBob21lIGZvciBlbmdhZ2luZyBpbiBi' +
					'YWNrLXRvLWJhY2sgcGFpciBwcm9ncmFtbWluZy4gV2l0aCBhbGwgdGhlIG9wcG9ydHVuaXRpZXM' +
					'geW91IGhhdmUgaGVyZSBhdCBDeXBoLCB5b3UgZG9uJ3QgbmVlZCBiYWNrLXRvLWJhY2sgcGFpci' +
					'Bwcm9ncmFtbWluZy4gSnVzdCBkb24ndCBkbyBpdC4='
				,
				record: {
					id: '82e5bbb348baa9a37019804c49cca4f2a9079f98',
					mediaType: 'text/plain',
					name: "Imagine: you're a developer; it's your first day here...",
					recordType: 'note',
					size: 368,
					timestamp: -296938800000
				}
			},
			{
				data:
					'ewoJInNob3J0X25hbWUiOiAiQ3lwaCIsCgkibmFtZSI6ICJDeXBoIOKAkyBFbmNyeXB0ZWQgTWV' +
					'zc2VuZ2VyIiwKCSJpY29ucyI6IFsKCQl7CgkJCSJzcmMiOiAiL2ltZy9mYXZpY29uL2Zhdmljb2' +
					'4tOTZ4OTYucG5nIiwKCQkJInNpemVzIjogIjk2eDk2IiwKCQkJInR5cGUiOiAiaW1hZ2UvcG5nI' +
					'goJCX0sCgkJewoJCQkic3JjIjogIi9pbWcvZmF2aWNvbi9hcHBsZS10b3VjaC1pY29uLTE0NHgx' +
					'NDQucG5nIiwKCQkJInNpemVzIjogIjE0NHgxNDQiLAoJCQkidHlwZSI6ICJpbWFnZS9wbmciCgk' +
					'JfSwKCQl7CgkJCSJzcmMiOiAiL2ltZy9mYXZpY29uL2Zhdmljb24tMTkyeDE5Mi5wbmciLAoJCQ' +
					'kic2l6ZXMiOiAiMTkyeDE5MiIsCgkJCSJ0eXBlIjogImltYWdlL3BuZyIKCQl9CgldLAoJInN0Y' +
					'XJ0X3VybCI6ICIvIiwKCSJkaXNwbGF5IjogInN0YW5kYWxvbmUiCn0K'
				,
				record: {
					id: 'e9f7bbb3d538a22c1f84b854f347cef999a4780b',
					mediaType: 'application/json',
					name: 'manifest.json',
					recordType: 'file',
					size: 435,
					timestamp: 1234051200000
				}
			}
		];

		if (!(await this.localStorageService.hasItem('initiated'))) {
			for (const user of users) {
				this.accountDatabaseService.current	= {keys: {}, user};

				await this.accountDatabaseService.setItem(
					`users/${user.username}/publicProfile`,
					user,
					true
				);

				await this.accountDatabaseService.setItem(
					`users/${user.username}/contactList`,
					users.filter(o => o !== user).map(o => o.username)
				);

				await this.accountDatabaseService.setItem(
					`users/${user.username}/fileList`,
					files.map(o => o.record)
				);

				for (const file of files) {
					await this.accountDatabaseService.setItem(
						`users/${user.username}/files/${file.record.id}`,
						this.potassiumService.fromBase64(file.data)
					);
				}
			}

			this.accountDatabaseService.current	= undefined;

			await this.localStorageService.setItem('initiated', true);
		}


		try {
			await this.login(
				await this.localStorageService.getItemString('username'),
				'hunter2'
			);
		}
		catch (_) {}

		this.resolveReady();
	})(); }
}
