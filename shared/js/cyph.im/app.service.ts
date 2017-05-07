import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {Router} from '@angular/router';
import * as $ from 'jquery';
import {util} from '../cyph/util';
import {ChatRootStates} from './enums';


/**
 * Angular service for Cyph web UI.
 */
@Injectable()
export class AppService {
	/** @see ChatRootStates */
	public chatRootState: ChatRootStates	= ChatRootStates.blank;

	/** If true, app is locked down. */
	public isLockedDown: boolean			= !!customBuildPassword;

	constructor (routerService: Router, titleService: Title) {
		titleService.setTitle(util.translate(titleService.getTitle()));

		self.onhashchange	= () => { location.reload(); };

		(async () => {
			const urlSegmentPaths	=
				(
					await (
						await util.waitForValue(() =>
							routerService.routerState.root.firstChild || undefined
						)
					).url.first().toPromise()
				).map(o => o.path)
			;

			if (this.isLockedDown) {
				await util.sleep(1000);
			}
			else if (urlSegmentPaths[0] !== 'account') {
				while (this.chatRootState === ChatRootStates.blank) {
					await util.sleep();
				}

				await util.sleep();
			}

			$(document.body).addClass('load-complete');
		})();
	}
}
