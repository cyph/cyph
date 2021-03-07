import {ErrorHandler} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {env} from '../env';
import {AnalyticsService} from '../services/analytics.service';
import {ErrorService} from '../services/error.service';
import {FileService} from '../services/file.service';
import {NotificationService} from '../services/notification.service';
import {ScreenshotService} from '../services/screenshot.service';
import {SignupService} from '../services/signup.service';
import {VirtualKeyboardWatcherService} from '../services/virtual-keyboard-watcher.service';
import {WindowWatcherService} from '../services/window-watcher.service';

/** Providers for CyphCommonModule. */
export const commonModuleProviders = [
	AnalyticsService,
	ErrorService,
	FileService,
	NotificationService,
	ScreenshotService,
	SignupService,
	Title,
	VirtualKeyboardWatcherService,
	WindowWatcherService,
	...(env.isLocalEnv ?
		[] :
		[
			{
				provide: ErrorHandler,
				useExisting: ErrorService
			}
		])
];
