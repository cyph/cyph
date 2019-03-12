import {animate, state, style, transition, trigger} from '@angular/animations';


const on	= style({
	filter: 'brightness(5) drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.5))'
});

const off	= style({});


/** Flash in animation. */
export const flashIn	= trigger('flashIn', [
	state('in', off),
	transition(':enter', [
		animate(1500),
		on,
		animate(1500)
	])
]);
