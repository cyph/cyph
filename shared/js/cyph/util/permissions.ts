import {env} from '../env';

const checkPermissionInternal = async (permission: string) =>
	new Promise<{hasPermission: boolean}>((resolve, reject) => {
		(<any> self).cordova.plugins.permissions.checkPermission(
			permission,
			resolve,
			reject
		);
	});

const requestPermissionsInternal = async (permissions: string[]) =>
	new Promise<{hasPermission: boolean}>((resolve, reject) => {
		(<any> self).cordova.plugins.permissions.requestPermissions(
			permissions,
			resolve,
			reject
		);
	});

/**
 * If applicable, requests permissions from OS. No-op on non-Android platforms for now.
 * @returns Whether permissions are granted.
 */
export const requestPermissions = async (
	...permissions: string[]
) : Promise<boolean> => {
	if (!(env.isCordova && env.isAndroid) || permissions.length < 1) {
		return true;
	}

	permissions = permissions.map(s => `android.permission.${s}`);

	try {
		const newPermissions = (
			await Promise.all(
				permissions.map(async permission => ({
					permission,
					status: await checkPermissionInternal(permission)
				}))
			)
		)
			.filter(o => o.status.hasPermission)
			.map(o => o.permission);

		if (newPermissions.length < 1) {
			return true;
		}

		const newPermissionsStatus = await requestPermissionsInternal(
			newPermissions
		);

		return newPermissionsStatus.hasPermission;
	}
	catch {
		return false;
	}
};
