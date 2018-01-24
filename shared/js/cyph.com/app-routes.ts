/* tslint:disable:object-literal-sort-keys */

import {Routes} from '@angular/router';
import {AppComponent} from './components/app';


/** @see Routes */
export const appRoutes: Routes	= [
	{path: '**', component: AppComponent},
	{path: '', component: AppComponent},
	{path: '404', component: AppComponent},
	{path: 'about', component: AppComponent},
	{path: 'betalist', component: AppComponent},
	{path: 'checkout/:category/:item', component: AppComponent},
	{path: 'claimusername', component: AppComponent},
	{path: 'claimusername/:email', component: AppComponent},
	{path: 'contact', component: AppComponent},
	{path: 'contact/:email', component: AppComponent},
	{path: 'disrupt', component: AppComponent},
	{path: 'donate', component: AppComponent},
	{path: 'faq', component: AppComponent},
	{path: 'features', component: AppComponent},
	{path: 'gettingstarted', component: AppComponent},
	{path: 'intro', component: AppComponent},
	{path: 'invite', component: AppComponent},
	{path: 'invite/:code', component: AppComponent},
	{path: 'jjgo', component: AppComponent},
	{path: 'judgejohn', component: AppComponent},
	{path: 'mybrother', component: AppComponent},
	{path: 'penn', component: AppComponent},
	{path: 'privacypolicy', component: AppComponent},
	{path: 'register', component: AppComponent},
	{path: 'sawbones', component: AppComponent},
	{path: 'security', component: AppComponent},
	{path: 'termsofservice', component: AppComponent},
	{path: 'testimonials', component: AppComponent},
	{path: 'ventura', component: AppComponent},
	{path: 'waitlisttrack', component: AppComponent}
];
