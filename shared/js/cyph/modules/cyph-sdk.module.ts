import {NgModule} from '@angular/core';
import {sdkModuleProviders} from '../providers/sdk-module';
import {CyphAppModule} from './cyph-app.module';

/**
 * Common module with shared imports for SDK projects.
 */
@NgModule({
	imports: [CyphAppModule],
	providers: sdkModuleProviders
})
export class CyphSDKModule {
	constructor () {}
}
