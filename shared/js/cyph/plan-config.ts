import {CyphPlans, CyphPlanTypes} from './proto';

interface IPlanTypeConfig {
	enableGroup: boolean;
	enablePasswords: boolean;
	enableScheduler: boolean;
	enableScreenSharing: boolean;
	enableWallets: boolean;
	homePage: string[];
	initialInvites?: number;
	innerCircleLimit?: number;
	planType: CyphPlanTypes;
	rank: number;
	storageCapGB: number;
	telehealth: boolean;
	unlimitedCalling: boolean;
	upsell: boolean;
	usernameMinLength: number;
}

const planTypeConfig: Record<CyphPlanTypes, IPlanTypeConfig> = {
	[CyphPlanTypes.Business]: {
		enableGroup: true,
		enablePasswords: false,
		enableScheduler: true,
		enableScreenSharing: true,
		enableWallets: false,
		homePage: ['schedule'],
		planType: CyphPlanTypes.Business,
		rank: 2,
		storageCapGB: 100,
		telehealth: false,
		unlimitedCalling: true,
		upsell: false,
		usernameMinLength: 5
	},
	[CyphPlanTypes.FoundersAndFriends]: {
		enableGroup: true,
		enablePasswords: true,
		enableScheduler: true,
		enableScreenSharing: true,
		enableWallets: true,
		homePage: ['profile'],
		planType: CyphPlanTypes.FoundersAndFriends,
		rank: 4,
		storageCapGB: 1024,
		telehealth: false,
		unlimitedCalling: true,
		upsell: false,
		usernameMinLength: 1
	},
	[CyphPlanTypes.Free]: {
		enableGroup: false,
		enablePasswords: false,
		enableScheduler: false,
		enableScreenSharing: true,
		enableWallets: false,
		homePage: ['profile'],
		innerCircleLimit: 5,
		planType: CyphPlanTypes.Free,
		rank: 0,
		storageCapGB: 0.5,
		telehealth: false,
		unlimitedCalling: false,
		upsell: true,
		usernameMinLength: 5
	},
	[CyphPlanTypes.Platinum]: {
		enableGroup: true,
		enablePasswords: true,
		enableScheduler: false,
		enableScreenSharing: true,
		enableWallets: true,
		homePage: ['profile'],
		planType: CyphPlanTypes.Platinum,
		rank: 3,
		storageCapGB: 1024,
		telehealth: false,
		unlimitedCalling: true,
		upsell: false,
		usernameMinLength: 1
	},
	[CyphPlanTypes.Premium]: {
		enableGroup: true,
		enablePasswords: false,
		enableScheduler: false,
		enableScreenSharing: true,
		enableWallets: false,
		homePage: ['profile'],
		planType: CyphPlanTypes.Premium,
		rank: 2,
		storageCapGB: 100,
		telehealth: false,
		unlimitedCalling: true,
		upsell: true,
		usernameMinLength: 5
	},
	[CyphPlanTypes.Supporter]: {
		enableGroup: true,
		enablePasswords: false,
		enableScheduler: false,
		enableScreenSharing: true,
		enableWallets: false,
		homePage: ['profile'],
		innerCircleLimit: 15,
		planType: CyphPlanTypes.Supporter,
		rank: 1,
		storageCapGB: 5,
		telehealth: false,
		unlimitedCalling: false,
		upsell: true,
		usernameMinLength: 5
	},
	[CyphPlanTypes.Telehealth]: {
		enableGroup: true,
		enablePasswords: false,
		enableScheduler: true,
		enableScreenSharing: true,
		enableWallets: false,
		homePage: ['schedule'],
		planType: CyphPlanTypes.Telehealth,
		rank: 2,
		storageCapGB: 100,
		telehealth: true,
		unlimitedCalling: true,
		upsell: false,
		usernameMinLength: 5
	}
};

/** Plan configuration details. */
export type CyphPlanConfig = IPlanTypeConfig & {
	checkoutPath?: string;
	lifetime: boolean;
};

/** Configuration options for Cyph plans. */
export const planConfig: Record<
	CyphPlans,
	IPlanTypeConfig & {
		checkoutPath?: string;
		lifetime: boolean;
	}
> = {
	[CyphPlans.AnnualBusiness]: {
		...planTypeConfig[CyphPlanTypes.Business],
		checkoutPath: 'accounts/annual-business',
		lifetime: false
	},
	[CyphPlans.AnnualPlatinum]: {
		...planTypeConfig[CyphPlanTypes.Platinum],
		checkoutPath: 'accounts/annual-platinum',
		lifetime: false
	},
	[CyphPlans.AnnualPremium]: {
		...planTypeConfig[CyphPlanTypes.Premium],
		checkoutPath: 'accounts/annual-premium',
		lifetime: false
	},
	[CyphPlans.AnnualSupporter]: {
		...planTypeConfig[CyphPlanTypes.Supporter],
		checkoutPath: 'accounts/annual-supporter',
		lifetime: false
	},
	[CyphPlans.AnnualTelehealth]: {
		...planTypeConfig[CyphPlanTypes.Telehealth],
		checkoutPath: 'accounts/annual-telehealth',
		lifetime: false
	},
	[CyphPlans.FoundersAndFriends]: {
		...planTypeConfig[CyphPlanTypes.FoundersAndFriends],
		lifetime: true
	},
	[CyphPlans.FoundersAndFriends_Telehealth]: {
		...planTypeConfig[CyphPlanTypes.FoundersAndFriends],
		lifetime: true,
		telehealth: true
	},
	[CyphPlans.Free]: {
		...planTypeConfig[CyphPlanTypes.Free],
		lifetime: false
	},
	[CyphPlans.LifetimePlatinum]: {
		...planTypeConfig[CyphPlanTypes.Platinum],
		lifetime: true
	},
	[CyphPlans.MonthlyBusiness]: {
		...planTypeConfig[CyphPlanTypes.Business],
		checkoutPath: 'accounts/monthly-business',
		lifetime: false
	},
	[CyphPlans.MonthlyPlatinum]: {
		...planTypeConfig[CyphPlanTypes.Platinum],
		checkoutPath: 'accounts/monthly-platinum',
		lifetime: false
	},
	[CyphPlans.MonthlyPremium]: {
		...planTypeConfig[CyphPlanTypes.Premium],
		checkoutPath: 'accounts/monthly-premium',
		lifetime: false
	},
	[CyphPlans.MonthlySupporter]: {
		...planTypeConfig[CyphPlanTypes.Supporter],
		checkoutPath: 'accounts/monthly-supporter',
		lifetime: false
	},
	[CyphPlans.MonthlyTelehealth]: {
		...planTypeConfig[CyphPlanTypes.Telehealth],
		checkoutPath: 'accounts/monthly-telehealth',
		lifetime: false
	}
};
