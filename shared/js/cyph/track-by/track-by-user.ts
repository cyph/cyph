/** User track by function. */
export const trackByUser = <
	T extends {
		anonymousUser?: {name: string};
		username: string;
	}
>(
	_I: number,
	item: T
) => item.anonymousUser || item.username;
