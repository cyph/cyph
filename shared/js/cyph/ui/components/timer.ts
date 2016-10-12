import {Templates} from '../templates';
import {Util} from '../../util';


/**
 * Angular component for countdown timer.
 */
export class Timer {
	/** Module/component title. */
	public static title: string	= 'cyphTimer';

	private autostart: boolean;
	private stopped: boolean;
	private countdown: number;
	private hours: string;
	private minutes: string;
	private seconds: string;

	constructor ($scope, $element, $attrs) {
		$element['start']	= () => {
			const endTime	= Util.timestamp() + this.countdown * 1000;

			const interval	= setInterval(() => {
				const diff	= endTime - Util.timestamp();

				if (this.stopped || diff < 1) {
					$scope.$parent.hours	= '0';
					$scope.$parent.minutes	= '0';
					$scope.$parent.seconds	= '00';

					clearInterval(interval);
					return;
				}

				$scope.$parent.hours	= Math.floor(diff / 3600000).toString();
				$scope.$parent.minutes	= Math.floor((diff % 3600000) / 60000).toString();
				$scope.$parent.seconds	= ('0' + Math.floor(((diff % 3600000) % 60000) / 1000)).slice(-2);
			}, 500);
		};

		$element['stop']	= () => {
			this.stopped	= true;
		};
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
