const backgroundMode = (<any> self).cordova?.plugins?.backgroundMode;

/** Disables background mode (if applicable). */
export const disableBackgroundMode = () => {
	if (!backgroundMode) {
		return;
	}

	try {
		backgroundMode.disable();
	}
	catch {}
};

/** Enables background mode (if applicable). */
export const enableBackgroundMode = () => {
	if (!backgroundMode) {
		return;
	}

	try {
		backgroundMode.enable();
	}
	catch {}
};
