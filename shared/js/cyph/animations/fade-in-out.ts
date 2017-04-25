import {animate, state, style, transition, trigger} from '@angular/animations';

export const fadeInOut	= trigger('fadeInOut', [
	state('in', style({opacity: '1'})),
	transition(':enter', [
		style({opacity: '0'}),
		animate(750)
	]),
	transition(':leave', [
		animate(750, style({opacity: '0'}))
	])
]);
