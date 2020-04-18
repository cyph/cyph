import {EnvDeploy, envDeploy} from './env-deploy';
import {parse} from './util/serialization';

const geolocationPromise = (async () => {
	try {
		const o = parse<{
			analID?: string;
			city?: string;
			continent?: string;
			continentCode?: string;
			country?: string;
			countryCode?: string;
			org?: string;
			postalCode?: string;
		}>(
			/* Reduce size / drop Angular dependency on cyph.com home page */
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			await fetch(
				`${envDeploy.baseUrl}geolocation/${EnvDeploy.languageInternal}`
			).then(o => o.text())
		);

		return {
			analID: typeof o.analID === 'string' ? o.analID : undefined,
			city: typeof o.city === 'string' ? o.city : undefined,
			continent:
				typeof o.continent === 'string' ? o.continent : undefined,
			continentCode:
				typeof o.continentCode === 'string' ?
					o.continentCode :
					undefined,
			country: typeof o.country === 'string' ? o.country : undefined,
			countryCode:
				typeof o.countryCode === 'string' ? o.countryCode : undefined,
			org: typeof o.org === 'string' ? o.org : undefined,
			postalCode:
				typeof o.postalCode === 'string' ? o.postalCode : undefined
		};
	}
	catch {
		return {};
	}
})();

/** Geolocation data. */
export const geolocation = {
	analID: (async () => (await geolocationPromise).analID)(),
	city: (async () => (await geolocationPromise).city)(),
	continent: (async () => (await geolocationPromise).continent)(),
	continentCode: (async () => (await geolocationPromise).continentCode)(),
	country: (async () => (await geolocationPromise).country)(),
	countryCode: (async () => (await geolocationPromise).countryCode)(),
	org: (async () => (await geolocationPromise).org)(),
	postalCode: (async () => (await geolocationPromise).postalCode)()
};
