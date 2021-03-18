import {EnvDeploy, envDeploy} from './env-deploy';
import {parse} from './util/serialization';

const geolocationPromise = (async () => {
	try {
		const data = parse<{
			analID?: string;
			city?: string;
			continent?: string;
			continentCode?: string;
			country?: string;
			countryCode?: string;
			firebaseRegion?: string;
			org?: string;
			postalCode?: string;
		}>(
			/* Reduce size / drop Angular dependency on cyph.com home page */
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			await fetch(
				`${envDeploy.baseUrl}geolocation/${EnvDeploy.languageInternal}`
			).then(async o => o.text())
		);

		return {
			analID: typeof data.analID === 'string' ? data.analID : undefined,
			city: typeof data.city === 'string' ? data.city : undefined,
			continent:
				typeof data.continent === 'string' ? data.continent : undefined,
			continentCode:
				typeof data.continentCode === 'string' ?
					data.continentCode :
					undefined,
			country:
				typeof data.country === 'string' ? data.country : undefined,
			countryCode:
				typeof data.countryCode === 'string' ?
					data.countryCode :
					undefined,
			firebaseRegion:
				typeof data.firebaseRegion === 'string' ?
					data.firebaseRegion :
					undefined,
			org: typeof data.org === 'string' ? data.org : undefined,
			postalCode:
				typeof data.postalCode === 'string' ?
					data.postalCode :
					undefined
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
	firebaseRegion: (async () => (await geolocationPromise).firebaseRegion)(),
	org: (async () => (await geolocationPromise).org)(),
	postalCode: (async () => (await geolocationPromise).postalCode)()
};
