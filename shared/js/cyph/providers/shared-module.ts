import {AffiliateService} from '../services/affiliate.service';
import {ConfigService} from '../services/config.service';
import {DialogService} from '../services/dialog.service';
import {DOMPurifyHtmlSanitizerService} from '../services/dompurify-html-sanitizer.service';
import {EnvService} from '../services/env.service';
import {HtmlSanitizerService} from '../services/html-sanitizer.service';
import {MaterialDialogService} from '../services/material-dialog.service';
import {SalesService} from '../services/sales.service';
import {SplitTestingService} from '../services/split-testing.service';
import {StringsService} from '../services/strings.service';

/** Providers for CyphSharedModule. */
export const sharedModuleProviders = [
	AffiliateService,
	ConfigService,
	EnvService,
	SalesService,
	SplitTestingService,
	StringsService,
	{
		provide: DialogService,
		useClass: MaterialDialogService
	},
	{
		provide: 'EnvService',
		useExisting: EnvService
	},
	{
		provide: HtmlSanitizerService,
		useClass: DOMPurifyHtmlSanitizerService
	}
];
