import {animate, state, style, transition, trigger} from '@angular/animations';

export const fadeIn	= trigger('fadeIn', [
	state('in', style({opacity: '1'})),
	transition(':enter', [
		style({opacity: '0'}),
		animate(750)
	])
]);
