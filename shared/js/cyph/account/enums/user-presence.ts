/**
 * Possible user presence statuses.
 */
export enum UserPresence {
	away,
	busy,
	offline,
	online
}

/** UserPresence values in sorting order for UI. */
export const userPresence	= [
	UserPresence.online,
	UserPresence.away,
	UserPresence.busy,
	UserPresence.offline
];
