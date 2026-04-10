import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions - Furrie',
};

const sectionStyle = { marginBottom: '2rem' };
const h2Style = { fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' } as const;
const pStyle = { color: '#444' };
const pSpacedStyle = { color: '#444', marginBottom: '0.75rem' };
const ulStyle = { color: '#444', paddingLeft: '1.5rem' };
const ulSpacedStyle = { color: '#444', paddingLeft: '1.5rem', marginBottom: '0.75rem' };
const indentStyle = { color: '#444', paddingLeft: '1.5rem', marginBottom: '0.25rem' };
const capsStyle = { color: '#444', fontSize: '0.9rem', lineHeight: 1.8 };

export default function TermsPage() {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Terms and Conditions</h1>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
        <strong>Furrie</strong> — Veterinary Teleconsultation Platform
      </p>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
        <strong>Operated by:</strong> Pakta Technologies (OPC) Pvt. Ltd., operating under the trade name &quot;Furrie&quot;
      </p>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Effective Date: 10 April 2026</p>
      <p style={{ color: '#888', fontSize: '0.875rem', marginBottom: '2rem' }}>Last Updated: 10 April 2026</p>

      {/* Emergency Warning Box */}
      <section style={{ marginBottom: '2rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem', color: '#856404' }}>
          Important: Not for Emergencies
        </h2>
        <p style={{ color: '#856404' }}>
          <strong>Furrie is NOT an emergency veterinary service.</strong> If your pet is experiencing a
          life-threatening emergency — such as difficulty breathing, uncontrolled bleeding, suspected poisoning,
          seizures, collapse, or severe trauma — please take your pet to the nearest emergency veterinary
          facility immediately. Do not rely on teleconsultation for emergencies.
        </p>
      </section>

      {/* Section 1 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Introduction and Acceptance</h2>
        <p style={pSpacedStyle}>
          1.1. These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you
          (&quot;User&quot;, &quot;you&quot;, &quot;your&quot;) and Pakta Technologies (OPC) Pvt. Ltd., operating
          under the trade name &quot;Furrie&quot; (&quot;Furrie&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
          governing your access to and use of the veterinary teleconsultation services available at furrie.in,
          app.furrie.in, and associated mobile applications (collectively, the &quot;Platform&quot;).
        </p>
        <p style={pSpacedStyle}>
          1.2. By creating an account, registering a pet, booking a consultation, or otherwise using the Platform,
          you confirm that you have read, understood, and agree to be bound by these Terms, our Privacy Policy,
          and any supplemental terms we may publish from time to time. If you do not agree, you must not use the Platform.
        </p>
        <p style={pStyle}>
          1.3. We may amend these Terms at any time by publishing the revised version on the Platform with an
          updated &quot;Last Updated&quot; date. Material changes will be notified via the email address associated
          with your account at least seven (7) days before they take effect. Your continued use of the Platform
          after the effective date constitutes acceptance of the revised Terms.
        </p>
      </section>

      {/* Section 2 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Eligibility</h2>
        <p style={pSpacedStyle}>
          2.1. You must be at least eighteen (18) years of age to create an account or use the Platform.
          No exceptions are made for individuals under the age of eighteen (18).
        </p>
        <p style={pSpacedStyle}>2.2. By registering, you represent that:</p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) you are at least eighteen (18) years of age;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) the information you provide is accurate, complete, and current;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) you are the lawful owner or authorised caretaker of the pet(s) you register on the Platform;</p>
          <p style={{ marginBottom: '0.25rem' }}>(d) you have the legal capacity to enter into these Terms.</p>
        </div>
      </section>

      {/* Section 3 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>3. Nature of the Service</h2>
        <p style={pSpacedStyle}>
          3.1. Furrie is a <strong>technology platform</strong> that connects pet owners (&quot;Customers&quot;)
          with independently licensed veterinary professionals (&quot;Veterinarians&quot;) for remote video-based
          consultations. Furrie itself does not practice veterinary medicine, nor does it employ the Veterinarians
          who appear on the Platform.
        </p>
        <p style={pSpacedStyle}>
          3.2. Veterinarians on the Platform hold valid registrations with the Veterinary Council of India (VCI)
          or their respective State Veterinary Councils. Furrie verifies credentials before onboarding but does
          not guarantee or warrant any specific clinical outcome.
        </p>
        <p style={pStyle}>
          3.3. The Platform currently supports consultations for <strong>dogs and cats only</strong> within the
          territory of India, conducted in the <strong>English language</strong>.
        </p>
      </section>

      {/* Section 4 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>4. Important Limitations of Teleconsultation</h2>
        <p style={pSpacedStyle}>
          4.1. <strong>NOT AN EMERGENCY SERVICE.</strong> If your pet is experiencing a life-threatening
          emergency — including but not limited to difficulty breathing, uncontrolled bleeding, suspected
          poisoning, seizures, collapse, or severe trauma — you must take your pet to the nearest in-person
          veterinary facility immediately. Do not rely on teleconsultation for emergencies.
        </p>
        <p style={pSpacedStyle}>
          4.2. All diagnoses rendered through the Platform are <strong>provisional</strong> and based solely on
          the information and visual observations available during the video call. The Veterinarian cannot perform
          a physical examination, palpation, auscultation, diagnostic imaging, or laboratory testing remotely.
        </p>
        <p style={pSpacedStyle}>
          4.3. The Veterinarian may, at their professional discretion, recommend that you seek an in-person
          examination, laboratory tests, imaging, or specialist referral. Such recommendations should be
          followed promptly.
        </p>
        <p style={pSpacedStyle}>4.4. Teleconsultation is generally appropriate for:</p>
        <ul style={ulSpacedStyle}>
          <li>General wellness queries and preventive care guidance</li>
          <li>Behavioural concerns</li>
          <li>Minor, non-emergency symptoms</li>
          <li>Follow-up after an in-person visit</li>
          <li>Treatment plan review and medication queries</li>
          <li>Nutrition and dietary advice</li>
          <li>Triage to determine urgency of in-person care</li>
        </ul>
        <p style={pStyle}>
          4.5. You acknowledge that any reliance on the advice provided during a teleconsultation is at your
          own risk and that teleconsultation has inherent limitations that may affect the accuracy and
          completeness of the clinical assessment.
        </p>
      </section>

      {/* Section 5 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5. User Accounts</h2>
        <p style={pSpacedStyle}>
          5.1. <strong>Registration.</strong> You may register using OTP-based email verification. You are
          responsible for maintaining the confidentiality of any credentials, OTPs, and session tokens
          associated with your account.
        </p>
        <p style={pSpacedStyle}>
          5.2. <strong>One Account Per Person.</strong> Each individual may maintain only one Customer account.
          Duplicate accounts may be merged or terminated at our discretion.
        </p>
        <p style={pSpacedStyle}>
          5.3. <strong>Accuracy.</strong> You must keep your account information — including email address,
          phone number, and pet medical details — accurate and up to date. Inaccurate information may
          compromise the quality of veterinary advice you receive.
        </p>
        <p style={pSpacedStyle}>
          5.4. <strong>Account Security.</strong> You are solely responsible for all activities that occur under
          your account. Notify us immediately at{' '}
          <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a> if
          you suspect unauthorised access.
        </p>
        <p style={pSpacedStyle}>
          5.5. <strong>Suspension and Termination.</strong> We reserve the right to suspend or terminate your
          account, with or without notice, if you:
        </p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) breach these Terms;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) provide false or misleading information;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) engage in abusive, threatening, or harassing behaviour towards Veterinarians or staff;</p>
          <p style={{ marginBottom: '0.25rem' }}>(d) misuse the referral or invite system;</p>
          <p style={{ marginBottom: '0.25rem' }}>(e) fail to pay for services rendered.</p>
        </div>
      </section>

      {/* Section 6 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>6. Pet Registration and Health Information</h2>
        <p style={pSpacedStyle}>
          6.1. When you register a pet, you provide information including the pet&apos;s name, species, breed,
          date of birth or approximate age, weight, medical history, allergies, current medications, vaccination
          records, dietary details, and photographs (&quot;Pet Health Data&quot;).
        </p>
        <p style={pSpacedStyle}>
          6.2. You represent that the Pet Health Data you provide is truthful and complete to the best of your
          knowledge. Incomplete or inaccurate Pet Health Data may adversely affect the quality of veterinary advice.
        </p>
        <p style={pStyle}>
          6.3. Pet Health Data is treated as sensitive personal data under applicable Indian law and is processed
          in accordance with our Privacy Policy.
        </p>
      </section>

      {/* Section 7 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>7. Consultations</h2>
        <p style={pSpacedStyle}>
          7.1. <strong>Booking.</strong> You may book a scheduled consultation by selecting an available time
          slot and a registered pet. You must join the video call within the window of five (5) minutes before
          to forty-five (45) minutes after the scheduled time.
        </p>
        <p style={pSpacedStyle}>
          7.2. <strong>Missed Consultations.</strong> A consultation not joined within the join window will be
          automatically marked as missed. Consultation credits used for missed consultations are{' '}
          <strong>not automatically refunded</strong> but may be reinstated at our discretion on a case-by-case basis.
        </p>
        <p style={pSpacedStyle}>
          7.3. <strong>Cancellation.</strong> You may cancel a scheduled consultation before the join window
          opens. Credits used for cancelled consultations will be reinstated to your account.
        </p>
        <p style={pSpacedStyle}>
          7.4. <strong>Recording and Consent.</strong> Consultations may be recorded when recording is enabled
          for quality assurance, training, and dispute resolution purposes. A recording notice is displayed
          when recording is active. By continuing the consultation after seeing the notice, you consent to the
          recording. Recordings are stored securely and are not shared with any third party except as required
          by law or for the purposes stated herein.
        </p>
        <p style={pSpacedStyle}>
          7.5. <strong>Veterinarian Discretion.</strong> The Veterinarian may, at their sole professional
          discretion, decline to provide advice on a condition they deem inappropriate for teleconsultation
          and may instead direct you to seek in-person care.
        </p>
        <p style={pSpacedStyle}>
          7.6. <strong>Treatment Plans.</strong> Following a consultation, the Veterinarian may create a
          Treatment Plan that includes observations, diagnosis, recommended lab tests, medications, dietary
          and home-care advice, warning signs, and follow-up instructions. Treatment Plans are generated as
          PDF documents and emailed to you. They are also accessible in your account on the Platform.
        </p>
        <p style={pStyle}>
          7.7. <strong>Follow-up Communication.</strong> After a completed consultation, a follow-up messaging
          thread may be available for a limited period (seven days for standard users). Follow-up messages
          are not a substitute for a new consultation.
        </p>
      </section>

      {/* Section 8 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>8. Consultation Credits and Packs</h2>
        <p style={pSpacedStyle}>
          8.1. <strong>Credits.</strong> Access to consultations requires consultation credits. Credits may
          be acquired through:
        </p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) consultation packs assigned or purchased;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) promotional grants;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) referral/invite rewards; or</p>
          <p style={{ marginBottom: '0.25rem' }}>(d) administrative assignment by Furrie.</p>
        </div>
        <p style={{ ...pSpacedStyle, marginTop: '0.75rem' }}>
          8.2. <strong>Consultation Packs.</strong> Packs are bundles of consultation credits. Packs are:
        </p>
        <ul style={ulSpacedStyle}>
          <li><strong>Non-refundable</strong> once activated, except where required by applicable consumer protection law or at Furrie&apos;s sole discretion.</li>
          <li><strong>Valid as long as the Platform operates.</strong> Pack credits do not expire.</li>
          <li><strong>Non-transferable</strong> between accounts.</li>
          <li>Consumed on a first-in-first-out (FIFO) basis — the oldest active pack&apos;s credits are used first.</li>
        </ul>
        <p style={pSpacedStyle}>
          8.3. <strong>Offline Purchase Flow.</strong> During certain periods, pack purchases may be processed
          offline. You may submit a request via the Platform specifying the number of consultations desired.
          Our team will coordinate payment with you, after which credits will be added to your account.
        </p>
        <p style={pStyle}>
          8.4. <strong>Pricing.</strong> All prices are in Indian Rupees (INR). Prices are subject to change;
          however, changes will not affect packs already purchased or credits already granted.
        </p>
      </section>

      {/* Section 9 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>9. Invite and Referral Programme</h2>
        <p style={pSpacedStyle}>
          9.1. Each registered Customer receives one (1) invite code that can be shared with another pet owner.
          When a new user signs up using a valid invite code:
        </p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) the <strong>invitee</strong> receives one (1) free consultation credit, valid for sixty (60) days; and</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) the <strong>referrer</strong> receives one (1) free consultation credit after the invitee completes their first consultation on the Platform.</p>
        </div>
        <p style={{ ...pSpacedStyle, marginTop: '0.75rem' }}>
          9.2. Invite codes are single-use and non-transferable. Self-referral (using your own invite code) is
          prohibited and will be automatically rejected.
        </p>
        <p style={pSpacedStyle}>
          9.3. Furrie reserves the right to modify, suspend, or terminate the invite programme at any time, and
          to revoke credits obtained through fraudulent or abusive use of the programme, including but not
          limited to creating fake accounts, automated sign-ups, or any form of gaming the system.
        </p>
        <p style={pStyle}>
          9.4. Invite-granted credits are valid for sixty (60) days from the date of issuance. Unused invite
          credits are forfeited after this period.
        </p>
      </section>

      {/* Section 10 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>10. Payments</h2>
        <p style={pSpacedStyle}>
          10.1. Where payment is required, it is processed through our authorised payment partners. Furrie does
          not store your credit card, debit card, or UPI details directly.
        </p>
        <p style={pSpacedStyle}>10.2. All completed and delivered consultations are non-refundable unless:</p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) the consultation was materially defective due to a technical failure on our part;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) a refund is required under the Consumer Protection Act, 2019; or</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) Furrie, at its sole discretion, determines a refund is warranted.</p>
        </div>
        <p style={{ ...pSpacedStyle, marginTop: '0.75rem' }}>
          10.3. Refund requests must be submitted within seven (7) days of the consultation by emailing{' '}
          <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a> with
          the consultation reference number and a description of the issue.
        </p>
        <p style={pStyle}>
          10.4. Approved refunds are processed as credit reinstatement to your account (not monetary refunds
          to your original payment method) unless otherwise determined by Furrie.
        </p>
      </section>

      {/* Section 11 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>11. Intellectual Property</h2>
        <p style={pSpacedStyle}>
          11.1. All content on the Platform — including but not limited to the Furrie name, logo, design, text,
          graphics, user interface, software code, and documentation — is the intellectual property of Pakta
          Technologies (OPC) Pvt. Ltd. or its licensors and is protected under applicable Indian and
          international intellectual property laws.
        </p>
        <p style={pSpacedStyle}>
          11.2. You may not copy, reproduce, distribute, modify, create derivative works from, publicly display,
          or otherwise exploit any Platform content without prior written consent from Furrie.
        </p>
        <p style={pStyle}>
          11.3. <strong>User Content.</strong> You retain ownership of content you upload to the Platform (pet
          photographs, medical documents, consultation media). By uploading, you grant Furrie a non-exclusive,
          worldwide, royalty-free licence to store, process, display (to you and your assigned Veterinarian),
          and use such content solely for the purpose of providing the services described herein. This licence
          terminates when you delete the content or your account, subject to our data retention obligations.
        </p>
      </section>

      {/* Section 12 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>12. Prohibited Conduct</h2>
        <p style={pSpacedStyle}>12.1. You agree not to:</p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) use the Platform for any unlawful purpose;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) impersonate another person or entity;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) provide false, misleading, or fraudulent information;</p>
          <p style={{ marginBottom: '0.25rem' }}>(d) harass, abuse, or threaten Veterinarians, other users, or Furrie staff;</p>
          <p style={{ marginBottom: '0.25rem' }}>(e) attempt to gain unauthorised access to the Platform, other accounts, or our systems;</p>
          <p style={{ marginBottom: '0.25rem' }}>(f) use automated tools (bots, scrapers) to access the Platform;</p>
          <p style={{ marginBottom: '0.25rem' }}>(g) circumvent, disable, or interfere with security or access-control features;</p>
          <p style={{ marginBottom: '0.25rem' }}>(h) upload malicious software, viruses, or harmful code;</p>
          <p style={{ marginBottom: '0.25rem' }}>(i) resell, sublicence, or commercially exploit the Platform or its content.</p>
        </div>
      </section>

      {/* Section 13 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>13. Disclaimer of Warranties</h2>
        <p style={{ ...capsStyle, marginBottom: '0.75rem' }}>
          13.1. THE PLATFORM AND ALL SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
          BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT
          LIMITATION IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p style={pSpacedStyle}>13.2. Furrie does not warrant that:</p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) the Platform will be uninterrupted, error-free, or completely secure;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) any specific clinical outcome will result from a teleconsultation;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) a Veterinarian will be available at any given time.</p>
        </div>
        <p style={{ ...pStyle, marginTop: '0.75rem' }}>
          13.3. Furrie is a technology intermediary. The clinical advice provided during consultations is the
          sole responsibility of the Veterinarian. Furrie disclaims liability for any act, omission, opinion,
          or recommendation made by any Veterinarian on the Platform.
        </p>
      </section>

      {/* Section 14 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>14. Limitation of Liability</h2>
        <p style={{ ...capsStyle, marginBottom: '0.75rem' }}>
          14.1. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, FURRIE&apos;S AGGREGATE LIABILITY TO YOU
          FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE PLATFORM SHALL NOT
          EXCEED THE TOTAL AMOUNT PAID BY YOU TO FURRIE IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE
          EVENT GIVING RISE TO THE CLAIM.
        </p>
        <p style={{ ...capsStyle, marginBottom: '0.75rem' }}>
          14.2. IN NO EVENT SHALL FURRIE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL,
          PET HEALTH OUTCOMES, OR OTHER INTANGIBLE LOSSES, EVEN IF FURRIE HAS BEEN ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p style={pStyle}>
          14.3. Nothing in these Terms shall limit liability that cannot be limited under applicable law,
          including liability for fraud or wilful misconduct.
        </p>
      </section>

      {/* Section 15 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>15. Indemnification</h2>
        <p style={pSpacedStyle}>
          15.1. You agree to indemnify, defend, and hold harmless Pakta Technologies (OPC) Pvt. Ltd., its
          officers, directors, employees, contractors, and affiliates from and against any claims, damages,
          losses, liabilities, costs, and expenses (including reasonable legal fees) arising from:
        </p>
        <div style={indentStyle}>
          <p style={{ marginBottom: '0.25rem' }}>(a) your use of or inability to use the Platform;</p>
          <p style={{ marginBottom: '0.25rem' }}>(b) your breach of these Terms;</p>
          <p style={{ marginBottom: '0.25rem' }}>(c) your violation of any applicable law or regulation;</p>
          <p style={{ marginBottom: '0.25rem' }}>(d) content you upload or submit to the Platform;</p>
          <p style={{ marginBottom: '0.25rem' }}>(e) your interaction with any Veterinarian on the Platform.</p>
        </div>
      </section>

      {/* Section 16 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>16. Governing Law and Dispute Resolution</h2>
        <p style={pSpacedStyle}>
          16.1. These Terms shall be governed by and construed in accordance with the laws of India, without
          regard to conflict-of-law principles.
        </p>
        <p style={pSpacedStyle}>
          16.2. <strong>Dispute Resolution.</strong> Any dispute, controversy, or claim arising out of or
          relating to these Terms or the services shall first be attempted to be resolved through good-faith
          negotiation. If the dispute is not resolved within thirty (30) days, either party may refer the
          matter to arbitration administered under the Arbitration and Conciliation Act, 1996. The arbitration
          shall be conducted by a sole arbitrator mutually appointed by the parties, seated in Mumbai,
          Maharashtra, India, and conducted in the English language.
        </p>
        <p style={pSpacedStyle}>
          16.3. Nothing in this Section prevents either party from seeking interim or injunctive relief from
          a court of competent jurisdiction.
        </p>
        <p style={pStyle}>
          16.4. Subject to Section 16.2, the courts in Mumbai, Maharashtra, India shall have exclusive jurisdiction.
        </p>
      </section>

      {/* Section 17 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>17. Grievance Redressal</h2>
        <p style={pSpacedStyle}>
          17.1. In accordance with the Information Technology Act, 2000 and the rules made thereunder, the
          Grievance Officer for the Platform is:
        </p>
        <div style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem', color: '#444' }}>
          <p style={{ marginBottom: '0.25rem' }}><strong>Name:</strong> Aenesh Angshu Sengupta</p>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>
          </p>
          <p><strong>Response Time:</strong> We will acknowledge your grievance within forty-eight (48) hours and endeavour to resolve it within fifteen (15) days.</p>
        </div>
        <p style={pStyle}>
          17.2. If you are not satisfied with the resolution, you may escalate your complaint to the appropriate
          consumer forum or regulatory authority.
        </p>
      </section>

      {/* Section 18 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>18. Force Majeure</h2>
        <p style={pStyle}>
          18.1. Furrie shall not be liable for any failure or delay in performance of its obligations under
          these Terms to the extent such failure or delay is caused by circumstances beyond its reasonable
          control, including but not limited to natural disasters, pandemics, government orders, internet
          outages, power failures, or acts of third-party service providers.
        </p>
      </section>

      {/* Section 19 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>19. Severability</h2>
        <p style={pStyle}>
          19.1. If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of
          competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid
          provision shall be modified to the minimum extent necessary to make it valid and enforceable while
          preserving the intent of the parties.
        </p>
      </section>

      {/* Section 20 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>20. Entire Agreement</h2>
        <p style={pStyle}>
          20.1. These Terms, together with the Privacy Policy and any supplemental terms published on the
          Platform, constitute the entire agreement between you and Furrie regarding the subject matter hereof
          and supersede all prior and contemporaneous agreements, proposals, and communications, whether
          written or oral.
        </p>
      </section>

      {/* Section 21 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>21. Contact</h2>
        <p style={pSpacedStyle}>For questions, concerns, or feedback regarding these Terms:</p>
        <div style={{ paddingLeft: '1.5rem', color: '#444' }}>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>
          </p>
          <p style={{ marginBottom: '0.25rem' }}>
            <strong>Grievance Officer:</strong> Aenesh Angshu Sengupta (
            <a href="mailto:support@furrie.in" style={{ color: 'var(--color-primary)' }}>support@furrie.in</a>)
          </p>
          <p><strong>Website:</strong> <a href="https://furrie.in" style={{ color: 'var(--color-primary)' }}>https://furrie.in</a></p>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '2rem 0' }} />
      <p style={{ color: '#888', fontSize: '0.875rem', fontStyle: 'italic' }}>
        Pakta Technologies (OPC) Pvt. Ltd., operating under the trade name &quot;Furrie&quot;
      </p>
      <p style={{ color: '#888', fontSize: '0.875rem', fontStyle: 'italic' }}>
        Mumbai, Maharashtra, India
      </p>
    </div>
  );
}
