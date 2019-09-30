import {env} from '../env';

/** Reloads window, or performs equivalent behavior depending on platform. */
export const reloadWindow = () : void => {
	if (env.isCordovaDesktop) {
		window.close();
	}
	else if (env.isWeb) {
		location.reload();
	}
	else {
		/* TODO: HANDLE NATIVE */
	}
};
