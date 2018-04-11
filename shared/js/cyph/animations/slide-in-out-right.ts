import {animate, state, style, transition, trigger} from '@angular/animations';


/** Slide in and out from the right animation. */
export const slideInOutRight	= trigger('slideInOutRight', [
	state('in', style({transform: 'translateX(-100%)'})),
	transition(':enter', [
		style({transform: 'translateX(100%)'}),
		animate('0.35s ease-in-out')
	]),
	transition(':leave', [
		animate('0.35s ease-in-out', style({transform: 'translateX(100%)'}))
	])
]);
