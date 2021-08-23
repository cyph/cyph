/* eslint-disable @typescript-eslint/tslint/config */

import {Routes} from '@angular/router';
import {BlankComponent} from '../cyph/components/blank';
import {EmailComposeComponent} from '../cyph/components/email-compose';
import {env} from '../cyph/env';
import {account, login, retry} from '../cyph/routes';
import {AppService} from './app.service';
import {EphemeralChatRootComponent} from './components/ephemeral-chat-root';
import {SignupConfirmComponent} from './components/signup-confirm';

account.canActivate = [AppService];

const burner = {
	path: '**',
	canActivate: [AppService],
	component: EphemeralChatRootComponent
};

/** @see Routes */
export const appRoutes = <Routes> [
	...(!env.environment.customBuild?.config.lockedDown ?
		[] :
		[
			{path: 'confirm/:apiKey', component: SignupConfirmComponent},
			{path: 'unlock/:password', component: BlankComponent}
		]),
	retry,
	...(burnerRoot === '' ?
		[burner] :
		[
			...(!env.environment.production ?
				[
					{
						path: `${burnerRoot}-group-test`,
						children: [
								{
									...burner,
									data: {groupTest: true}
								}
							]
					},
					{
						path: `${burnerRoot}-ui-test`,
						children: [
								{
									...burner,
									data: {uiTest: true}
								}
							]
					},
					{
						path: 'email-compose-test',
						component: EmailComposeComponent
					}
				] :
				[]),
			{path: burnerRoot, children: [burner]},
			login,
			account
		])
];
