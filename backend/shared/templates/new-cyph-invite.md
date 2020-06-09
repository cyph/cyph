{{^fromApp}}Hello{{#name}} {{name}}{{/name}},{{/fromApp}}

{{#purchased}}
Welcome to Cyph; thanks for signing up! Your support means a lot to us, and helps ensure that we're able to continue our work to protect user privacy.

{{#inviteCode}}
[**Click here to set up your account.**]({{accountsURL}}register/{{inviteCode}})
{{/inviteCode}}

{{^inviteCode}}
Here are your invite codes:

{{#inviteCodes}}
[{{accountsURLShort}}register/{{.}}]({{accountsURL}}register/{{.}})  
{{/inviteCodes}}
{{/inviteCode}}
{{/purchased}}


{{^purchased}}

{{#planChange}}
{{#planChangeUpgrade}}
Your status has been upgraded from {{oldPlan}}!
{{/planChangeUpgrade}}

{{^planChangeUpgrade}}
Your status has changed (previously {{oldPlan}}).
{{/planChangeUpgrade}}
{{/planChange}}


{{^planChange}}
{{^fromApp}}
{{#inviterName}}{{inviterName}} has invited you to join Cyph!{{/inviterName}}
{{^inviterName}}Your Cyph invite has arrived!{{/inviterName}}

{{#inviteCode}}
[**Click here to set up your account.**]({{accountsURL}}register/{{inviteCode}})
{{/inviteCode}}

{{^inviteCode}}
Here are your invite codes:

{{#inviteCodes}}
[{{accountsURLShort}}register/{{.}}]({{accountsURL}}register/{{.}})  
{{/inviteCodes}}
{{/inviteCode}}
{{/fromApp}}

{{#fromApp}}
Congratulations on securing your Cyph account invite!
{{/fromApp}}
{{/planChange}}

{{/purchased}}


---

{{#planFoundersAndFriends}}
|||
| ------------ | :--------------------: |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Founders & Friends** |
|              | Platinum               |
|              | Premium                |
|              | Supporter              |
|              | Free                   |

---
{{/planFoundersAndFriends}}
{{#planFoundersAndFriendsTelehealth}}
|||
| ------------ | :--------------------: |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Founders & Friends (Telehealth)** |
|              | Platinum               |
|              | Premium                |
|              | Supporter              |
|              | Free                   |

---
{{/planFoundersAndFriendsTelehealth}}
{{#planPlatinum}}
|||
| ------------ | :--------------------: |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Platinum**  |
|              | Premium                |
|              | Supporter              |
|              | Free                   |

---
{{/planPlatinum}}
{{#planPremium}}
|||
| ------------ | :--------------------: |
|              | Platinum               |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Premium**     |
|              | Supporter              |
|              | Free                   |

---
{{/planPremium}}
{{#planSupporter}}
|||
| ------------ | :--------------------: |
|              | Platinum               |
|              | Premium                |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Supporter**    |
|              | Free                   |

---
{{/planSupporter}}
{{#planAnnualBusiness}}
|||
| ------------ | :--------------------: |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Business (Annual)**     |
|              | Business (Monthly)   |
|              | Free                   |

---
{{/planAnnualBusiness}}
{{#planMonthlyBusiness}}
|||
| ------------ | :--------------------: |
|              | Business (Annual)    |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Business (Monthly)**    |
|              | Free                   |

---
{{/planMonthlyBusiness}}
{{#planAnnualTelehealth}}
|||
| ------------ | :--------------------: |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Telehealth (Annual)**     |
|              | Telehealth (Monthly)   |
|              | Free                   |

---
{{/planAnnualTelehealth}}
{{#planMonthlyTelehealth}}
|||
| ------------ | :--------------------: |
|              | Telehealth (Annual)    |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Telehealth (Monthly)**    |
|              | Free                   |

---
{{/planMonthlyTelehealth}}

{{^planChange}}
We highly recommend that you sign up from your desktop or laptop in a location where you have some privacy.

---
{{/planChange}}

Your {{#planFree}}account{{/planFree}}{{^planFree}}plan{{/planFree}} also includes:

{{#storageCap}}
* **{{storageCap}}** storage
{{/storageCap}}

{{#initialInvites}}
* **{{initialInvites}} more invites** to share with your friends
{{/initialInvites}}

{{#enableWallets}}
* **Cyph Wallet** cryptocurrency wallet feature
{{/enableWallets}}

{{#platinumFeatures}}
* **Short username:** You can bypass our minimum of 5 characters and register a username as short as you'd like

* **Verification:** You'll be first in line when we set up a "verified accounts" system like Twitter's

* **Lifetime priority support:** Email us any time at founders@cyph.com — or just add @ryan and @josh on Cyph :)
{{/platinumFeatures}}

---

If you have any questions{{^planChange}} about the signup process{{/planChange}}, just email help@cyph.com.
