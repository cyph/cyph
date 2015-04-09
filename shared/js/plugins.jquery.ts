/// <reference path="globals.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


/* Get element bounds */

$.fn.bounds	= (e) : {[direction: string] : number} => {
	let $this: JQuery				= $(e.currentTarget);
	let bounds: JQueryCoordinates	= $this.offset();

	return {
		top: bounds.top,
		left: bounds.left,
		bottom: bounds.top + $this.outerHeight(),
		right: bounds.left + $this.outerWidth()
	};
};
