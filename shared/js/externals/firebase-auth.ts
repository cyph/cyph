/* eslint-disable */

/** @file firebase/auth external. */

const auth = eval('require')('firebase/auth');

export type Auth = any;

export const getAuth = auth.getAuth;

export const indexedDBLocalPersistence: any = auth.indexedDBLocalPersistence;

export const inMemoryPersistence: any = auth.inMemoryPersistence;

export const signInWithEmailAndPassword: any = auth.signInWithEmailAndPassword;

export const updatePassword: any = auth.updatePassword;
