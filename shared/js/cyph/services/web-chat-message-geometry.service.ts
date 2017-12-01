import {Injectable} from '@angular/core';
import * as $ from 'jquery';
import {IChatMessageDimensions} from '../proto';


/**
 * ChatMessageGeometryService implementation for the web.
 */
@Injectable()
export class WebChatMessageGeometryService {
	/** @inheritDoc */
	public getDimensions (message: HTMLElement) : IChatMessageDimensions {
		const $body		= $(document.body);
		const $message	= $(message).clone();

		const $container	= $(
			`<div style='
				position: absolute;
				visibility: hidden;
				height: auto;
				width: auto;
				white-space: nowrap;
			'>
				<div style='font-size: 1.7em'></div>
			</div>`
		);

		$body.append($container);
		$container.children().append($message);

		const getDimensionsHelper	= () =>
			$message.find('cyph-markdown > span > *').hide().toArray().map(line => {
				const $line	= $(line);
				$line.show();
				const o	= {height: $line.height(), width: $line.width()};
				$line.hide();
				return o;
			})
		;

		const smallDimensions	= getDimensionsHelper();
		$container.css('font-size', '17.5px');
		const bigDimensions		= getDimensionsHelper();

		$container.remove();

		if (smallDimensions.length !== bigDimensions.length) {
			throw new Error('Invalid dimensions.');
		}

		return {lines: smallDimensions.map((smallScreen, i) => ({
			bigScreenHeight: bigDimensions[i].height,
			bigScreenWidth: bigDimensions[i].width,
			smallScreenHeight: smallScreen.height,
			smallScreenWidth: smallScreen.width
		}))};
	}

	/** @inheritDoc */
	public getHeight (dimensions: IChatMessageDimensions, maxWidth: number) : number {
		const bigScreen	= $(document.body).width() >= 1920;

		return (dimensions.lines || []).
			map(o => {
				const height	= bigScreen ? o.bigScreenHeight : o.smallScreenHeight;
				const width		= bigScreen ? o.bigScreenWidth : o.smallScreenWidth;
				return Math.ceil(width / maxWidth) * height + 20;
			}).
			reduce((a, b) => a + b, 0)
		;
	}

	/** @inheritDoc */
	public getMaxWidth (messageList: HTMLElement) : number {
		return $(messageList).width() * 0.8 - 30;
	}

	constructor () {}
}
