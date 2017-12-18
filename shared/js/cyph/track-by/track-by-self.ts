import {TrackByFunction} from '@angular/core';


/** Self track by function. */
export const trackBySelf: TrackByFunction<number|string>	= (_, item) => item;
