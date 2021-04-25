/** @see openWindow */
export const openWindowInternal = async (
	url: string,
	sameWindow: boolean = false
) : Promise<void> => {
	if (sameWindow) {
		location.href = url;
		return;
	}

	const a = document.createElement('a');
	a.href = url;
	a.target = '_blank';
	a.rel = 'noopener';
	a.click();
};
