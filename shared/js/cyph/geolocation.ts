import {env} from './env';
import {request} from './util/request';
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
			await request({
				retries: 5,
				url: `${env.baseUrl}geolocation/${env.realLanguage}`
			})
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
