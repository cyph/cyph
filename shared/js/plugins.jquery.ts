/// <reference path="globals.ts" />
/// <reference path="../lib/typings/jquery/jquery.d.ts" />


/* Get element bounds */

$.fn.bounds	= (e) : {[direction: string] : number} => {
	var $this: JQuery				= $(e.currentTarget);
	var bounds: JQueryCoordinates	= $this.offset();

	return {
		top: bounds.top,
		left: bounds.left,
		bottom: bounds.top + $this.outerHeight(),
		right: bounds.left + $this.outerWidth()
	};
};
