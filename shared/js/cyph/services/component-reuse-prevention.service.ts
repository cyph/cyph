import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouteReuseStrategy} from '@angular/router';
import {AccountChatComponent} from '../components/account-chat.component';


/**
 * RouteReuseStrategy implementation that prevents reuse of some components upon route change.
 */
@Injectable()
export class ComponentReusePreventionService implements RouteReuseStrategy {
	/** @inheritDoc */
	/* tslint:disable-next-line:no-null-keyword */
	public retrieve () : null {
		/* tslint:disable-next-line:no-null-keyword */
		return null;
	}

	/** @inheritDoc */
	public shouldAttach () : boolean {
		return false;
	}

	/** @inheritDoc */
	public shouldDetach () : boolean {
		return false;
	}

	/** @inheritDoc */
	public shouldReuseRoute (
		future: ActivatedRouteSnapshot,
		curr: ActivatedRouteSnapshot
	) : boolean {
		return future.routeConfig === curr.routeConfig && !future.children.concat(future).
			map(o => o.component === AccountChatComponent).
			reduce((a, b) => a || b)
		;
	}

	/** @inheritDoc */
	public store () : void {}

	constructor () {}
}
