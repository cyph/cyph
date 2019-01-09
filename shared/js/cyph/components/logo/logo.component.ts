import {ChangeDetectionStrategy, Component, HostBinding, Input} from '@angular/core';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {BaseProvider} from '../../base-provider';
import {EnvService} from '../../services/env.service';
import {StringsService} from '../../services/strings.service';
import {urlToSafeStyle} from '../../util/safe-values';


/**
 * Angular component to display logo.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'cyph-logo',
	styleUrls: ['./logo.component.scss'],
	templateUrl: './logo.component.html'
})
export class LogoComponent extends BaseProvider {
	/** @ignore */
	private altInternal: boolean		= false;

	/** @ignore */
	private cardHeaderInternal: boolean	= false;

	/** @ignore */
	private homeLinkInternal: boolean	= false;

	/** @ignore */
	private iconInternal: boolean		= false;

	/** Possible logos. */
	private readonly logos	= {
		horizontal: {
			alt: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.purple.horizontal.png'
				)
			),
			main: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.horizontal.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.horizontal.png'
				)
			)
		},
		icon: {
			alt: urlToSafeStyle(
				this.envService.customBuildImages.favicon ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.purple.icon.png'
				)
			),
			main: urlToSafeStyle(
				this.envService.customBuildImages.favicon ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.icon.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.favicon ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.icon.png'
				)
			)
		},
		vertical: {
			alt: urlToSafeStyle(
				this.envService.customBuildImages.logoVertical ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.purple.vertical.png'
				)
			),
			main: urlToSafeStyle(
				this.envService.customBuildImages.logoVertical ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.white.vertical.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.logoVertical ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/logo.telehealth.vertical.png'
				)
			)
		},
		video: {
			alt: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/betalogo.mobile.png'
				)
			),
			main: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/betalogo.mobile.png'
				)
			),
			telehealth: urlToSafeStyle(
				this.envService.customBuildImages.logoHorizontal ||
				this.domSanitizer.bypassSecurityTrustUrl(
					'/assets/img/telehealth.video.logo.png'
				)
			)
		}
	};

	/** @ignore */
	private verticalInternal: boolean	= false;

	/** @ignore */
	private videoInternal: boolean		= false;

	/** @ignore */
	private whiteInternal: boolean		= false;

	/** Alignment of logo position. */
	@Input() public alignment: 'bottom'|'center'|'left'|'right'|'top'	= 'center';

	/** Indicates whether to use alt version where available. */
	@Input()
	public get alt () : boolean {
		return this.altInternal;
	}
	public set alt (value: boolean) {
		this.altInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether image is a logo in a card. */
	@HostBinding('class.card-header-logo')
	@Input()
	public get cardHeader () : boolean {
		return this.cardHeaderInternal;
	}
	public set cardHeader (value: boolean) {
		this.cardHeaderInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to link to home URL. */
	@Input()
	public get homeLink () : boolean {
		return this.homeLinkInternal;
	}
	public set homeLink (value: boolean) {
		this.homeLinkInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to use icon image. */
	@Input()
	public get icon () : boolean {
		return this.iconInternal;
	}
	public set icon (value: boolean) {
		this.iconInternal	= (<any> value) === '' ? true : value;
	}

	/** Active logo. */
	public get logo () : Promise<SafeUrl> {
		const logoSet	=
			this.icon ?
				this.logos.icon :
				this.vertical ?
					this.logos.vertical :
					this.video ?
						this.logos.video :
						this.logos.horizontal
		;

		return this.envService.isTelehealth ?
			logoSet.telehealth :
		this.alt ?
			logoSet.alt :
			logoSet.main
		;
	}

	/** Indicates whether to use vertical image. */
	@Input()
	public get vertical () : boolean {
		return this.verticalInternal;
	}
	public set vertical (value: boolean) {
		this.verticalInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to use video image. */
	@Input()
	public get video () : boolean {
		return this.videoInternal;
	}
	public set video (value: boolean) {
		this.videoInternal	= (<any> value) === '' ? true : value;
	}

	/** Indicates whether to apply filter to make image white. */
	@Input()
	public get white () : boolean {
		return this.whiteInternal;
	}
	public set white (value: boolean) {
		this.whiteInternal	= (<any> value) === '' ? true : value;
	}

	constructor (
		/** @ignore */
		private readonly domSanitizer: DomSanitizer,

		/** @see EnvService */
		public readonly envService: EnvService,

		/** @see StringsService */
		public readonly stringsService: StringsService
	) {
		super();
	}
}
