Hello{{#name}} {{name}}{{/name}},

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
[**Click here to set up your Cyph beta account.**]({{accountsURL}}register/{{inviteCode}})
{{/fromApp}}

{{#fromApp}}
Congratulations on securing your Cyph account invite!
{{/fromApp}}
{{/planChange}}


---

{{#planFoundersAndFriends}}
|||
| ------------ | :--------------------: |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Founders & Friends** |
|              | Lifetime Platinum      |
|              | Gold                   |
|              | Silver                 |

---
{{/planFoundersAndFriends}}
{{#planLifetimePlatinum}}
|||
| ------------ | :--------------------: |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Lifetime Platinum**  |
|              | Gold                   |
|              | Silver                 |

---
{{/planLifetimePlatinum}}
{{#planGold}}
|||
| ------------ | :--------------------: |
|              | Lifetime Platinum      |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Gold**               |
|              | Silver                 |

---
{{/planGold}}
{{#planSilver}}
|||
| ------------ | :--------------------: |
|              | Lifetime Platinum      |
|              | Gold                   |
| {{^planChange}}Your{{/planChange}}{{#planChange}}New{{/planChange}} Status: | **Silver**             |

---
{{/planSilver}}

{{^planChange}}
We highly recommend that you sign up from your desktop or laptop in a location where you have
some privacy. Afterwards, you'll have three options to securely message your friends:

1. **New Burner Chat:** Initiates a temporary short-lived chat with no history

2. **Add Contact > External Contact:** Long-lived chat with history saved in your account

3. **Add Contact > Invite to Cyph:** Spends an invite to let them create their own account

---
{{/planChange}}

Your {{#planFree}}account{{/planFree}}{{^planFree}}plan{{/planFree}} also includes:

{{#storageCap}}
* **{{storageCap}}** storage
{{/storageCap}}

{{#initialInvites}}
* **{{initialInvites}} more invites** to share with your friends
{{/initialInvites}}

{{#walletEarlyAccess}}
* Early access to **Cyph Wallet** (when available; {{walletEarlyAccess}} release date TBD)
{{/walletEarlyAccess}}

{{#platinumFeatures}}
* **Short username:** You can bypass our minimum of 5 characters and register a username as short
as you'd like

* **Verification:** You'll be first in line when we set up a "verified accounts" system like
Twitter's

* **Lifetime priority support:** Email us any time at founders@cyph.com — or just add
@ryan and @josh on Cyph :)
{{/platinumFeatures}}

---

If you have any questions{{^planChange}} about the signup process{{/planChange}},
just email help@cyph.com.
