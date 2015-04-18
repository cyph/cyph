/// <reference path="base.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


$.fn.bounds	= e => {
	let $this: JQuery				= $(e.currentTarget);
	let bounds: JQueryCoordinates	= $this.offset();

	return {
		top: bounds.top,
		left: bounds.left,
		bottom: bounds.top + $this.outerHeight(),
		right: bounds.left + $this.outerWidth()
	};
};


$.fn.scrollPosition	= (e) : number => {
	return e.currentTarget.scrollHeight -
	(
		e.currentTarget.scrollTop +
		e.currentTarget.clientHeight
	);
};
