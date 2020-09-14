import {TrackByFunction} from '@angular/core';

/** User track by function. */
export const trackByUser: TrackByFunction<{
	anonymousUser?: {name: string};
	username: string;
}> = (_, item) => item.anonymousUser || item.username;
