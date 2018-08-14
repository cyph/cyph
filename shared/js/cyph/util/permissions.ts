import {env} from '../env';


/**
 * If applicable, requests permissions from OS. No-op on non-Android platforms for now.
 * @returns Whether permissions are granted.
 */
export const requestPermissions	= async (...permissions: string[]) : Promise<boolean> => {
	if (!(env.isCordova && env.isAndroid)) {
		return true;
	}

	permissions	= permissions.map(s => `android.permission.${s}`);

	try {
		await new Promise<void>((resolve, reject) => {
			(<any> self).plugins.Permission.has(
				permissions,
				(had: Record<string, boolean>) => {
					const newPermissions	= permissions.filter(permission => !had[permission]);

					if (newPermissions.length > 0) {
						(<any> self).plugins.Permission.request(
							newPermissions,
							(granted: Record<string, boolean>) => {
								if (newPermissions.find(permission => !granted[permission])) {
									reject();
								}
								else {
									resolve();
								}
							},
							reject
						);
					}
					else {
						resolve();
					}
				},
				reject
			);
		});

		return true;
	}
	catch {
		return false;
	}
};
