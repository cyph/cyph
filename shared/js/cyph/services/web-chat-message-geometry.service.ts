import {
	ApplicationRef,
	ComponentFactoryResolver,
	EmbeddedViewRef,
	Injectable,
	Injector
} from '@angular/core';
import * as $ from 'jquery';
import {ChatMessageComponent} from '../components/chat-message.component';
import {IChatMessage, IChatMessageDimensions} from '../proto';
import {ChatMessageGeometryService} from './chat-message-geometry.service';


/**
 * ChatMessageGeometryService implementation for the web.
 */
@Injectable()
export class WebChatMessageGeometryService extends ChatMessageGeometryService {
	/** @inheritDoc */
	public async getDimensions (message: IChatMessage) : Promise<IChatMessageDimensions> {
		const componentRef	= this.componentFactoryResolver.
			resolveComponentFactory(ChatMessageComponent).
			create(this.injector)
		;

		componentRef.instance.message	= message;

		this.applicationRef.attachView(componentRef.hostView);

		const $body			= $(document.body);

		const $message		= $(
			(<EmbeddedViewRef<ChatMessageComponent>> componentRef.hostView).rootNodes[0]
		);

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

		const getDimensionsHelper	= () =>
			$message.find('cyph-markdown > span > *').hide().toArray().map(line => {
				const $line	= $(line);
				$line.show();
				const o	= {height: $line.height(), width: $line.width()};
				$line.hide();
				return o;
			})
		;

		$body.append($container);
		$container.children().append($message);

		await componentRef.instance.viewInitiated;

		const smallDimensions	= getDimensionsHelper();
		$container.css('font-size', '17.5px');
		const bigDimensions		= getDimensionsHelper();

		this.applicationRef.detachView(componentRef.hostView);
		componentRef.destroy();
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

	constructor (
		/** @ignore */
		private readonly componentFactoryResolver: ComponentFactoryResolver,

		/** @ignore */
		private readonly applicationRef: ApplicationRef,

		/** @ignore */
		private readonly injector: Injector
	) {
		super();
	}
}
