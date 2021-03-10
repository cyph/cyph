/* eslint-disable */

/** @file firebase/app external. */

const firebaseInternal = eval('require')('firebase').default;

eval('require')('firebase/app');
eval('require')('firebase/auth');
eval('require')('firebase/database');
eval('require')('firebase/messaging');
eval('require')('firebase/storage');

namespace firebase {
	export const app = firebaseInternal.app;
	export const apps: any[] = firebaseInternal.apps;
	export const auth = firebaseInternal.auth;
	export const database = firebaseInternal.database;
	export const initializeApp = (config: any) =>
		firebaseInternal.initializeApp(config);
	export const messaging = firebaseInternal.messaging;
	export const storage = firebaseInternal.storage;
}

namespace firebase.app {
	export type App = any;
}

namespace firebase.auth {
	export type Auth = any;
}

namespace firebase.database {
	export type Database = any;
	export type DataSnapshot = any;
	export type Reference = any;
}

namespace firebase.messaging {
	export type Messaging = any;
}

namespace firebase.storage {
	export type Reference = any;
	export type Storage = any;
	export type UploadTaskSnapshot = any;
}

export default firebase;
