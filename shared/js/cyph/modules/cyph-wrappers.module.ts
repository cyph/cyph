import {NgModule, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {SocialShareComponent} from '../components/social-share';
import {CyphSharedModule} from './cyph-shared.module';

/**
 * Common module with shared imports for web projects.
 */
@NgModule({
	declarations: [SocialShareComponent],
	exports: [CyphSharedModule, SocialShareComponent],
	imports: [CyphSharedModule],
	schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CyphWrappersModule {
	constructor () {}
}
