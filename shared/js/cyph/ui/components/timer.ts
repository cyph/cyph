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

	constructor ($scope, $element, $attrs) {
		$element[0]['addCountdownSeconds']	= seconds => {
			this.endTime	+= seconds * 1000;
		};

		$element[0]['start']	= () => {
			const includeHours		= this.countdown >= 3600;
			const includeMinutes	= this.countdown >= 60;

			this.endTime	= Util.timestamp() + this.countdown * 1000;

			const interval	= setInterval(() => {
				const diff	= this.endTime - Util.timestamp();

				if (this.stopped || diff < 1) {
					$scope.$parent.timestamp	= includeHours ? '0:00:00' : '0:00';
					clearInterval(interval);
					return;
				}

				const hours		= Math.floor(diff / 3600000);
				const minutes	= Math.floor((diff % 3600000) / 60000);
				const seconds	= Math.floor(((diff % 3600000) % 60000) / 1000);

				$scope.$parent.timestamp	= includeHours ?
					`${hours}:${`0${minutes}`.slice(-2)}:${`0${seconds}`.slice(-2)}` :
					includeMinutes ?
						`${minutes}:${`0${seconds}`.slice(-2)}` :
						seconds
				;
			}, 500);
		};

		$element[0]['stop']	= () => {
			this.stopped	= true;
		};

		if (this.autostart) {
			$element[0]['start']();
		}
	}

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
