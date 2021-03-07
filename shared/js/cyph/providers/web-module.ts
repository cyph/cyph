import {LocalStorageService} from '../services/local-storage.service';
import {SocialShareService} from '../services/social-share.service';
import {WebLocalStorageService} from '../services/web-local-storage.service';

/** Providers for CyphWebModule. */
export const webModuleProviders = [
	SocialShareService,
	{
		provide: LocalStorageService,
		useClass: WebLocalStorageService
	}
];
