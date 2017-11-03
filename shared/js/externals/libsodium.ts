/* tslint:disable */

/** @file libsodium external. */


export const sodium	= (<any> self).sodium || {ready: Promise.resolve()};
export type ISodium	= any;
