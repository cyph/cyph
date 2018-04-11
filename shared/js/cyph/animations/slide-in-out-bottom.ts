import {animate, state, style, transition, trigger} from '@angular/animations';


/** Slide in and out from the bottom animation. */
export const slideInOutBottom	= trigger('slideInOutBottom', [
	state('in', style({transform: 'translateY(-50%)'})),
	transition(':enter', [
		style({transform: 'translateY(250px)'}),
		animate(400)
	]),
	transition(':leave', [
		animate(600, style({transform: 'translateY(250px)'}))
	])
]);
