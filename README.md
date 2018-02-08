# Cyph

[Cyph](https://www.cyph.com) is a secure communication tool designed to be
extremely friendly for users of any technical skill level, providing such
features as video calling and file transfers to both individuals and businesses.

The major advantage of Cyph over alternatives is that it can run right in your
browser. Having solved this problem (see #1 below) gives Cyph a uniquely smooth
user onboarding experience — just open the website, no app install required —
and also enables simple API integrations such as
[Hint's telehealth implementation](http://support.hint.com/knowledgebase/articles/863355)
through our cross-language SDK.

As to the level of security provided:

1. The research that led to our patented in-browser
[code signing](https://en.wikipedia.org/wiki/Code_signing) technology,
WebSign, was recently validated by the security industry in the course of our
successful talks at Black Hat 2016 and DEF CON 24. Before these talks, code
signing a web application was considered an
[intractable problem](https://news.ycombinator.com/item?id=7903720) — at the time
precluding the web as a platform for secure communication.

2. Cyph was audited by the pentesting firm [Cure53](https://cure53.de) against a threat
model focusing on nation-state-level attacks, who concluded, "Cyph provides security from
a broad range of cryptographic attacks and very strong client-side crypto. The general
conclusion of the test is that no major issues in regards to application security or
cryptographic implementations could be spotted in spite of a thorough audit."

3. In addition to strong confidentiality measures like end-to-end encryption, we're
the only credible solution currently addressing the future threat of
[quantum computing](https://uwaterloo.ca/institute-for-quantum-computing/quantum-computing-101)
— far beyond any present-day regulatory requirements like HIPAA, but worth covering
our bases on given [the NSA's announcement](https://www.fredericjacobs.com/blog/2016/01/27/NSA-QC).
