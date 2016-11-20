/**
 * @file Custom jQuery plugins.
 */


/**
 * Calculate absolute coordinates of the boundaries of this element.
 */
$.fn.bounds	= function () : ({
	bottom: number;
	left: number;
	right: number;
	top: number;
}) {
	const bounds: JQueryCoordinates	= this.offset();

	return {
		bottom: bounds.top + this.outerHeight(),
		left: bounds.left,
		right: bounds.left + this.outerWidth(),
		top: bounds.top
	};
};

/**
 * Calculate number of pixels user has scrolled relative to this element.
 */
$.fn.scrollPosition	= function () : number {
	return this[0].scrollHeight -
	(
		this[0].scrollTop +
		this[0].clientHeight
	);
};
