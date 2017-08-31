import {Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {
	ActivatedRouteSnapshot,
	CanActivate,
	Router,
	RouterStateSnapshot
} from '@angular/router';
import * as $ from 'jquery';
import {config} from '../cyph/config';
import {util} from '../cyph/util';
import {ChatRootStates} from './enums';


/**
 * Angular service for Cyph web UI.
 */
@Injectable()
export class AppService implements CanActivate {
	/** @ignore */
	private readonly lockedDownRoute: Promise<string>	= new Promise<string>(resolve => {
		this.resolveLockedDownRoute	= resolve;
	});

	/** @ignore */
	private resolveLockedDownRoute: (lockedDownRoute: string) => void;

	/** @see ChatRootStates */
	public chatRootState: ChatRootStates	= ChatRootStates.blank;

	/** If true, app is locked down. */
	public isLockedDown: boolean			=
		!!customBuildPassword &&
		!locationData.hash.match(
			new RegExp(`[${config.readableIDCharacters.join('|')}]{${config.secretLength}}$`)
		)
	;

	/** @ignore */
	private loadComplete () : void {
		$(document.body).addClass('load-complete');
	}

	/** @inheritDoc */
	public canActivate (_: ActivatedRouteSnapshot, state: RouterStateSnapshot) : boolean {
		if (this.isLockedDown) {
			this.resolveLockedDownRoute(state.url);
			return false;
		}
		else {
			return true;
		}
	}

	/** Disables lockdown. */
	public async unlock () : Promise<void> {
		if (!this.isLockedDown) {
			return;
		}

		this.isLockedDown	= false;
		this.routerService.navigateByUrl(await this.lockedDownRoute);
	}

	constructor (
		titleService: Title,

		/** @ignore */
		private readonly routerService: Router
	) {
		try {
			(<any> navigator).storage.persist();
		}
		catch {}

		titleService.setTitle(util.translate(titleService.getTitle()));

		self.onhashchange	= () => { location.reload(); };

		(async () => {
			if (this.isLockedDown) {
				this.loadComplete();
				return;
			}

			const urlSegmentPaths	=
				(
					await (
						await util.waitForValue(() =>
							routerService.routerState.root.firstChild || undefined
						)
					).url.first().toPromise()
				).map(o => o.path)
			;

			if (urlSegmentPaths[0] !== 'account') {
				while (this.chatRootState === ChatRootStates.blank) {
					await util.sleep();
				}

				await util.sleep();
			}

			this.loadComplete();
		})();
	}
}
