/// <reference path="base.ts" />
/// <reference path="../../lib/typings/jquery/jquery.d.ts" />


$.fn.bounds	= function () {
	let $this: JQuery				= $(this);
	let bounds: JQueryCoordinates	= $this.offset();

	return {
		top: bounds.top,
		left: bounds.left,
		bottom: bounds.top + $this.outerHeight(),
		right: bounds.left + $this.outerWidth()
	};
};


$.fn.scrollPosition	= function () {
	return this.scrollHeight -
	(
		this.scrollTop +
		this.clientHeight
	);
};
