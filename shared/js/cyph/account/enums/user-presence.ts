/**
 * Possible user presence statuses.
 */
export enum UserPresence {
	away,
	busy,
	offline,
	online
}

export const userPresence	= [
	UserPresence.online,
	UserPresence.away,
	UserPresence.busy,
	UserPresence.offline
];
