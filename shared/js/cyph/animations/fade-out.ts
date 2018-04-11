import {animate, state, style, transition, trigger} from '@angular/animations';


/** Fade out animation. */
export const fadeOut	= trigger('fadeOut', [
	state('in', style({opacity: '1'})),
	transition(':leave', [
		animate(750, style({opacity: '0'}))
	])
]);
