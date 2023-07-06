import {env} from '../env';

/**
 * If applicable, requests permissions from OS. No-op on non-Android platforms for now.
 * @returns Whether permissions are granted.
 */
export const requestPermissions = async (
	...permissions: string[]
) : Promise<boolean> => {
	if (!(env.isCordova && env.isAndroid)) {
		return true;
	}

	permissions = permissions.map(s => `permission.${s}`);

	try {
		const oldStatus = await new Promise<{hasPermission: boolean}>(
			(resolve, reject) => {
				(<any> self).cordova.plugins.permissions.checkPermission(
					permissions,
					resolve,
					reject
				);
			}
		);

		const newStatus = oldStatus.hasPermission ?
			oldStatus :
			await new Promise<{hasPermission: boolean}>((resolve, reject) => {
				(<any> self).cordova.plugins.permissions.requestPermission(
					permissions,
					resolve,
					reject
				);
			});

		return newStatus.hasPermission;
	}
	catch {
		return false;
	}
};
