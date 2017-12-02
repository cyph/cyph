import {
	ApplicationRef,
	ComponentFactoryResolver,
	EmbeddedViewRef,
	Injectable,
	Injector
} from '@angular/core';
import {ViewBase} from 'tns-core-modules/ui/core/view-base';
import {ChatMessageComponent} from '../components/chat-message.component';
import {IChatMessage, IChatMessageDimensions} from '../proto';
import {uuid} from '../util/uuid';
import {EnvService} from './env.service';


/**
 * Angular service for chat message geometry.
 */
@Injectable()
export class ChatMessageGeometryService {
	/** Calculates the dimensions of a chat message at its maximum potential width. */
	public async getDimensions (message: IChatMessage) : Promise<IChatMessageDimensions> {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return {lines: [{
				bigScreenHeight: 0,
				bigScreenWidth: 0,
				smallScreenHeight: 0,
				smallScreenWidth: 0
			}]};
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

		const id			= uuid();
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
			/* See https://github.com/palantir/tslint/issues/3505 */
			/* tslint:disable-next-line:no-unnecessary-type-assertion */
			const lines	= <HTMLElement[]> Array.from(
				document.querySelectorAll(`${id} cyph-markdown > span > *`)
			);

			if (lines.length < 1) {
				return [];
			}

			const defaultDisplay	= lines[0].style.display;

			for (const line of lines) {
				line.style.display	= 'none';
			}

			return lines.map(line => {
				line.style.display	= defaultDisplay;
				const o	= {height: line.offsetHeight, width: line.offsetWidth};
				line.style.display	= 'none';
				return o;
			});
		};

		document.body.appendChild(container);
		container.appendChild(containerChild);
		containerChild.appendChild(messageElement);

		await componentRef.instance.viewInitiated;

		const smallDimensions		= getDimensionsHelper();
		container.style.fontSize	= '17.5px';
		const bigDimensions			= getDimensionsHelper();

		this.applicationRef.detachView(componentRef.hostView);
		componentRef.destroy();
		container.remove();

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

	/** Calculates the height of a chat message for virtual scrolling. */
	public getHeight (dimensions: IChatMessageDimensions, maxWidth: number) : number {
		const bigScreen	= document.body.clientWidth >= 1920;

		return (dimensions.lines || []).
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
