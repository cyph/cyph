import {Injectable} from '@angular/core';
import {BaseProvider} from '../base-provider';
import {IFaviconSet} from '../favicon/ifavicon-set';
import {EnvService} from './env.service';


/**
 * Manages favicon.
 */
@Injectable()
export class FaviconService extends BaseProvider {
	/** @ignore */
	private readonly elements	= {
		apple: (size: string) => Array.from<HTMLLinkElement>(
			document.querySelectorAll(`link[rel='apple-touch-icon'][sizes='${size}x${size}']`)
		),
		icon: (size: string) => Array.from<HTMLLinkElement>(
			document.querySelectorAll(`link[rel='icon'][sizes='${size}x${size}']`)
		),
		mask: () => Array.from<HTMLLinkElement>(
			document.querySelectorAll(`link[rel='mask-icon']`)
		),
		mstile: () => Array.from<HTMLMetaElement>(
			document.querySelectorAll(`meta[name='msapplication-TileImage']`)
		),
		shortcut: (size: string) => Array.from<HTMLLinkElement>(
			document.querySelectorAll(`link[rel='shortcut icon'][sizes='${size}x${size}']`)
		)
	};

	/** @ignore */
	private readonly faviconSets: {[name: string]: IFaviconSet}	= {
		default: {
			apple114: '',
			apple120: '',
			apple144: '',
			apple152: '',
			apple180: '',
			apple57: '',
			apple60: '',
			apple72: '',
			apple76: '',
			icon16: '',
			icon160: '',
			icon192: '',
			icon256: '',
			icon32: '',
			icon96: '',
			mask: '',
			mstile: '',
			shortcut196: ''
		},
		telehealth: {
			apple114: '/assets/img/favicon/telehealth/apple-touch-icon-114x114.png',
			apple120: '/assets/img/favicon/telehealth/apple-touch-icon-120x120.png',
			apple144: '/assets/img/favicon/telehealth/apple-touch-icon-144x144.png',
			apple152: '/assets/img/favicon/telehealth/apple-touch-icon-152x152.png',
			apple180: '/assets/img/favicon/telehealth/apple-touch-icon-180x180.png',
			apple57: '/assets/img/favicon/telehealth/apple-touch-icon-57x57.png',
			apple60: '/assets/img/favicon/telehealth/apple-touch-icon-60x60.png',
			apple72: '/assets/img/favicon/telehealth/apple-touch-icon-72x72.png',
			apple76: '/assets/img/favicon/telehealth/apple-touch-icon-76x76.png',
			icon16: '/assets/img/favicon/telehealth/favicon-16x16.png',
			icon160: '/assets/img/favicon/telehealth/favicon-160x160.png',
			icon192: '/assets/img/favicon/telehealth/favicon-192x192.png',
			icon256: '/assets/img/favicon/telehealth/favicon-256x256.png',
			icon32: '/assets/img/favicon/telehealth/favicon-32x32.png',
			icon96: '/assets/img/favicon/telehealth/favicon-96x96.png',
			mask: '/assets/img/favicon/telehealth/mask.svg',
			mstile: '/assets/img/favicon/telehealth/mstile-144x144.png',
			shortcut196: '/assets/img/favicon/telehealth/favicon-196x196.png'
		}
	};

	/** Active favicon set. */
	public activeFaviconSet: IFaviconSet	= this.faviconSets.default;

	/**
	 * Changes favicon at run-time for non-co-branded instances.
	 * @param name Name of folder containing alternate favicon set under /assets/img/favicons.
	 */
	public setFavicon (name: 'default'|'telehealth' = 'default') : void {
		if (!this.envService.isWeb) {
			/* TODO: HANDLE NATIVE */
			return;
		}

		if (
			this.envService.environment.customBuild &&
			this.envService.environment.customBuild.favicon
		) {
			return;
		}

		this.activeFaviconSet	= this.faviconSets[name];

		for (const [elements, icon] of <[HTMLElement[], string][]> [
			[this.elements.apple('57'), this.activeFaviconSet.apple57],
			[this.elements.apple('60'), this.activeFaviconSet.apple60],
			[this.elements.apple('72'), this.activeFaviconSet.apple72],
			[this.elements.apple('76'), this.activeFaviconSet.apple76],
			[this.elements.apple('114'), this.activeFaviconSet.apple114],
			[this.elements.apple('120'), this.activeFaviconSet.apple120],
			[this.elements.apple('144'), this.activeFaviconSet.apple144],
			[this.elements.apple('152'), this.activeFaviconSet.apple152],
			[this.elements.apple('180'), this.activeFaviconSet.apple180],
			[this.elements.icon('16'), this.activeFaviconSet.icon16],
			[this.elements.icon('32'), this.activeFaviconSet.icon32],
			[this.elements.icon('96'), this.activeFaviconSet.icon96],
			[this.elements.icon('160'), this.activeFaviconSet.icon160],
			[this.elements.icon('192'), this.activeFaviconSet.icon192],
			[this.elements.icon('256'), this.activeFaviconSet.icon256],
			[this.elements.mask(), this.activeFaviconSet.mask],
			[this.elements.mstile(), this.activeFaviconSet.mstile],
			[this.elements.shortcut('196'), this.activeFaviconSet.shortcut196],

		]) {
			for (const elem of elements) {
				if (elem instanceof HTMLLinkElement) {
					elem.href		= icon;
				}
				else if (elem instanceof HTMLMetaElement) {
					elem.content	= icon;
				}
			}
		}
	}

	/* tslint:disable-next-line:cyclomatic-complexity */
	constructor (
		/** @ignore */
		private readonly envService: EnvService
	) {
		super();

		if (!this.envService.isWeb || this.faviconSets.default.apple114) {
			return;
		}

		this.faviconSets.default.apple114		= (this.elements.apple('114')[0] || {}).href || '';
		this.faviconSets.default.apple120		= (this.elements.apple('120')[0] || {}).href || '';
		this.faviconSets.default.apple144		= (this.elements.apple('144')[0] || {}).href || '';
		this.faviconSets.default.apple152		= (this.elements.apple('152')[0] || {}).href || '';
		this.faviconSets.default.apple180		= (this.elements.apple('180')[0] || {}).href || '';
		this.faviconSets.default.apple57		= (this.elements.apple('57')[0] || {}).href || '';
		this.faviconSets.default.apple60		= (this.elements.apple('60')[0] || {}).href || '';
		this.faviconSets.default.apple72		= (this.elements.apple('72')[0] || {}).href || '';
		this.faviconSets.default.apple76		= (this.elements.apple('76')[0] || {}).href || '';
		this.faviconSets.default.icon16			= (this.elements.icon('16')[0] || {}).href || '';
		this.faviconSets.default.icon160		= (this.elements.icon('160')[0] || {}).href || '';
		this.faviconSets.default.icon192		= (this.elements.icon('192')[0] || {}).href || '';
		this.faviconSets.default.icon256		= (this.elements.icon('256')[0] || {}).href || '';
		this.faviconSets.default.icon32			= (this.elements.icon('32')[0] || {}).href || '';
		this.faviconSets.default.icon96			= (this.elements.icon('96')[0] || {}).href || '';
		this.faviconSets.default.mask			= (this.elements.mask()[0] || {}).href || '';
		this.faviconSets.default.mstile			= (this.elements.mstile()[0] || {}).content || '';
		this.faviconSets.default.shortcut196	=
			(this.elements.shortcut('196')[0] || {}).href || ''
		;
	}
}
