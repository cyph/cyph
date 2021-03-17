import {configService as config, proto, util} from '@cyph/sdk';

const {CyphPlans, CyphPlanTypes} = proto;
const {readableByteLength, titleize} = util;

export const getInviteTemplateData = ({
	gift,
	inviteCode,
	inviteCodeGroups,
	inviteCodes,
	inviterName,
	name,
	oldPlan,
	plan,
	purchased,
	fromApp
}) => {
	const planConfig =
		config.planConfig[plan] || config.planConfig[CyphPlans.Free];
	const oldPlanConfig =
		oldPlan !== undefined ? config.planConfig[oldPlan] : undefined;
	const isUpgrade =
		oldPlanConfig !== undefined && planConfig.rank > oldPlanConfig.rank;

	return {
		...planConfig,
		...(oldPlan === undefined ?
			{} :
			{
				oldPlan: titleize(CyphPlans[oldPlan]),
				planChange: true,
				planChangeUpgrade: isUpgrade
			}),
		fromApp,
		gift,
		inviteCode,
		inviteCodeGroups:
			inviteCodeGroups !== undefined ?
				inviteCodeGroups
					.map(({codes, planGroup}) => ({
						codes: codes || [],
						plan: titleize(
							isNaN(planGroup.trialMonths) ||
								planGroup.trialMonths < 1 ?
								CyphPlans[planGroup.plan] :
								CyphPlans[planGroup.plan].replace(
									/^(Annual|Monthly)/,
									''
								)
						),
						trialDuration:
							isNaN(planGroup.trialMonths) ||
							planGroup.trialMonths < 1 ?
								undefined :
							planGroup.trialMonths < 12 ?
								`${Math.floor(
									planGroup.trialMonths
								)} Months`.replace('1 Months', '1 Month') :
								`${Math.floor(
									planGroup.trialMonths / 12
								)} Years`.replace('1 Years', '1 Year')
					}))
					.filter(o => o.codes.length > 0) :
				undefined,
		inviteCodes,
		inviterName,
		name,
		planAnnualBusiness: plan === CyphPlans.AnnualBusiness,
		planAnnualTelehealth: plan === CyphPlans.AnnualTelehealth,
		planFoundersAndFriends:
			planConfig.planType === CyphPlanTypes.FoundersAndFriends,
		planFoundersAndFriendsTelehealth:
			planConfig.planType === CyphPlanTypes.FoundersAndFriends_Telehealth,
		planFree: planConfig.planType === CyphPlanTypes.Free,
		planMonthlyBusiness: plan === CyphPlans.MonthlyBusiness,
		planMonthlyTelehealth: plan === CyphPlans.MonthlyTelehealth,
		planPlatinum: planConfig.planType === CyphPlanTypes.Platinum,
		planPremium: planConfig.planType === CyphPlanTypes.Premium,
		planSupporter: planConfig.planType === CyphPlanTypes.Supporter,
		platinumFeatures: planConfig.usernameMinLength === 1,
		purchased,
		storageCap: readableByteLength(planConfig.storageCapGB, 'gb')
	};
};
