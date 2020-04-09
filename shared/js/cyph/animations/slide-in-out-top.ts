import {animate, state, style, transition, trigger} from '@angular/animations';

/** Slide in and out from the top animation. */
export const slideInOutTop = trigger('slideInOutTop', [
	state('in', style({transform: 'translateY(0)'})),
	transition(':enter', [
		style({transform: 'translateY(-100%)'}),
		animate('0.35s ease-in-out')
	]),
	transition(':leave', [
		animate('0.35s ease-in-out', style({transform: 'translateY(-100%)'}))
	])
]);
