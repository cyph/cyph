/* Get element bounds */
$.fn.bounds	= function () {
	var $this	= $(this);
	var bounds	= $this.offset();

	bounds.bottom	= bounds.top + $this.outerHeight();
	bounds.right	= bounds.left + $this.outerWidth();

	return bounds;
};
