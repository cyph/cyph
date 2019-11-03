/** Sleep for the specifed amount of time. */
export const sleep = async (ms: number = 250) : Promise<void> => {
	return new Promise<void>(resolve => {
		/* eslint-disable-next-line @typescript-eslint/tslint/config */
		setTimeout(() => {
			resolve();
		}, ms);
	});
};
