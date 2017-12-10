import {
	ApplicationRef,
	ComponentFactoryResolver,
	EmbeddedViewRef,
	Injectable,
	Injector
} from '@angular/core';
import {ViewBase} from 'tns-core-modules/ui/core/view-base/view-base';
import {ChatMessage} from '../chat';
import {ChatMessageComponent} from '../components/chat-message.component';
import {uuid} from '../util/uuid';
import {EnvService} from './env.service';


/**
 * Angular service for chat message geometry.
 */
@Injectable()
export class ChatMessageGeometryService {
	/** Calculates the dimensions of a chat message at its maximum potential width. */
	public async getDimensions (message: ChatMessage) : Promise<ChatMessage> {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			message.dimensions	= [{
				bigScreenHeight: 0,
				bigScreenWidth: 0,
				smallScreenHeight: 0,
				smallScreenWidth: 0
			}];

			return message;
		}

		const componentRef	= this.componentFactoryResolver.
			resolveComponentFactory(ChatMessageComponent).
			create(this.injector)
		;

		componentRef.instance.message	= message;

		this.applicationRef.attachView(componentRef.hostView);

		const messageElement: HTMLElement	=
			(<EmbeddedViewRef<ChatMessageComponent>> componentRef.hostView).rootNodes[0]
		;

		const id			= `id-${uuid()}`;
		messageElement.id	= id;

		const container			= document.createElement('div');
		const containerChild	= document.createElement('div');

		container.style.height		= 'auto';
		container.style.position	= 'absolute';
		container.style.visibility	= 'hidden';
		container.style.whiteSpace	= 'nowrap';
		container.style.width		= 'auto';

		containerChild.style.fontSize	= '1.7em';

		const getDimensionsHelper	= () => {
			/* See https://github.com/palantir/tslint/issues/3540 */
			/* tslint:disable-next-line:no-unnecessary-type-assertion */
			const lines	= <HTMLElement[]> Array.from(
				document.querySelectorAll(`#${id} cyph-markdown > span > *`)
			);

			if (lines.length < 1) {
				return [];
			}

			const defaultDisplay	= lines[0].style.display;

			for (const line of lines) {
				line.style.display	= 'none';
			}

			const dimensions	= lines.map(line => {
				line.style.display	= defaultDisplay;
				const o	= {height: line.offsetHeight, width: line.offsetWidth};
				line.style.display	= 'none';
				return o;
			});

			for (const line of lines) {
				line.style.display	= defaultDisplay;
			}

			return dimensions;
		};

		document.body.appendChild(container);
		container.appendChild(containerChild);
		containerChild.appendChild(messageElement);

		await Promise.all([
			componentRef.instance.ngOnChanges({message: {
				currentValue: message,
				firstChange: true,
				isFirstChange: () => true,
				previousValue: undefined
			}}),
			componentRef.instance.waitUntilInitiated()
		]);

		const smallDimensions		= getDimensionsHelper();
		container.style.fontSize	= '17.5px';
		const bigDimensions			= getDimensionsHelper();

		this.applicationRef.detachView(componentRef.hostView);
		componentRef.destroy();
		container.remove();

		if (smallDimensions.length !== bigDimensions.length) {
			throw new Error('Invalid dimensions.');
		}

		message.dimensions	= smallDimensions.map((smallScreen, i) => ({
			bigScreenHeight: Math.floor(bigDimensions[i].height),
			bigScreenWidth: Math.floor(bigDimensions[i].width),
			smallScreenHeight: Math.floor(smallScreen.height),
			smallScreenWidth: Math.floor(smallScreen.width)
		}));

		return message;
	}

	/** Calculates the height of a chat message for virtual scrolling. */
	public async getHeight (
		message: ChatMessage,
		maxWidth: number,
		viewportWidth?: number
	) : Promise<number> {
		if (viewportWidth === undefined) {
			if (this.envService.isWeb) {
				viewportWidth	= document.body.clientWidth;
			}
			else {
				/* TODO: HANDLE NATIVE */
				viewportWidth	= 0;
			}
		}

		const bigScreen	= viewportWidth >= 1920;

		if (message.dimensions === undefined) {
			await this.getDimensions(message);
		}

		return (message.dimensions || []).
			map(o => {
				const height	= bigScreen ? o.bigScreenHeight : o.smallScreenHeight;
				const width		= bigScreen ? o.bigScreenWidth : o.smallScreenWidth;
				return Math.ceil(width / maxWidth) * height + 20;
			}).
			reduce((a, b) => a + b, 0)
		;
	}

	/** Calculates max message width for current UI and screen size. */
	public getMaxWidth (messageList: HTMLElement|ViewBase) : number {
		if (!(messageList instanceof HTMLElement)) {
			/* TODO: HANDLE NATIVE */
			return 0;
		}

		return messageList.offsetWidth * 0.8 - 30;
	}

	constructor (
		/** @ignore */
		private readonly applicationRef: ApplicationRef,

		/** @ignore */
		private readonly componentFactoryResolver: ComponentFactoryResolver,

		/** @ignore */
		private readonly injector: Injector,

		/** @ignore */
		private readonly envService: EnvService
	) {}
}
