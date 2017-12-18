import {TrackByFunction} from '@angular/core';


/** Value-containing-object track by function. */
export const trackByValue: TrackByFunction<{value: number|string}>	= (_, item) => item.value;
