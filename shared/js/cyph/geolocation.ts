import {env} from './env';
import {parse} from './util/serialization';

const geolocationPromise = (async () => {
	try {
		return parse<{
			continent?: string;
			continentCode?: string;
			country?: string;
			countryCode?: string;
			org?: string;
		}>(
			/* Reduce size / drop Angular dependency on cyph.com home page */
			/* eslint-disable-next-line @typescript-eslint/tslint/config */
			await fetch(
				`${env.baseUrl}geolocation/${env.realLanguage}`
			).then(o => o.text())
		);
	}
	catch {
		return {};
	}
})();

/** Geolocation data. */
export const geolocation = {
	continent: (async () => (await geolocationPromise).continent)(),
	continentCode: (async () => (await geolocationPromise).continentCode)(),
	country: (async () => (await geolocationPromise).country)(),
	countryCode: (async () => (await geolocationPromise).countryCode)(),
	org: (async () => (await geolocationPromise).org)()
};
