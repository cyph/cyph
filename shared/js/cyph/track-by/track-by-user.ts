import {TrackByFunction} from '@angular/core';

/** User track by function. */
export const trackByUser: TrackByFunction<{username: string}> = (_, item) =>
	item.username;
