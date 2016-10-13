import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for countdown timer.
 */
export class Timer {
	/** Module/component title. */
	public static title: string	= 'cyphTimer';

	private autostart: boolean	= false;
	private stopped: boolean	= false;
	private countdown: number	= 0;
	private endTime: number		= 0;

	private getTimestamp (
		diff: number,
		includeHours: boolean,
		includeMinutes: boolean
	) : string {
		const hours		= Math.floor(diff / 3600000);
		const minutes	= Math.floor((diff % 3600000) / 60000);
		const seconds	= Math.floor(((diff % 3600000) % 60000) / 1000);

		return includeHours ?
			`${hours}:${`0${minutes}`.slice(-2)}:${`0${seconds}`.slice(-2)}` :
			includeMinutes ?
				`${minutes}:${`0${seconds}`.slice(-2)}` :
				`${seconds}`
		;
	}

	constructor ($scope, $element, $attrs) { (async () => {
		for (let k of ['start', 'stop']) {
			$element[0][k]	= () => setTimeout(() => $element[0][k](), 100);
		}

		while (!this.countdown) {
			await Util.sleep(100);
		}

		const includeHours		= this.countdown >= 3600;
		const includeMinutes	= this.countdown >= 60;

		$scope.$parent.timestamp	= this.getTimestamp(
			this.countdown * 1000,
			includeHours,
			includeMinutes
		);

		$element[0]['addCountdownSeconds']	= seconds => {
			this.endTime	+= seconds * 1000;
		};

		$element[0]['start']	= () => {
			this.endTime	= Util.timestamp() + this.countdown * 1000;

			const interval	= setInterval(() => {
				const diff	= this.endTime - Util.timestamp();

				if (this.stopped || diff < 1) {
					$scope.$parent.timestamp	= includeHours ?
						'0:00:00' :
						'0:00'
					;
					clearInterval(interval);
					return;
				}

				$scope.$parent.timestamp	= this.getTimestamp(
					diff,
					includeHours,
					includeMinutes
				);
			}, 500);
		};

		$element[0]['stop']	= () => {
			this.stopped	= true;
		};

		if (this.autostart) {
			$element[0]['start']();
		}
	})(); }

	private static _	= (() => {
		angular.module(Timer.title, []).component(Timer.title, {
			bindings: {
				countdown: '<',
				autostart: '<'
			},
			controller: Timer,
			template: Templates.transclude,
			transclude: true
		});
	})();
}
