import Link from 'next/link';
import { CONDITION_DESCRIPTION, CONDITION_LABEL, CONDITIONS, formatINR, type StoreConfigDTO } from '@unibody/shared';
import { waLink } from '@/lib/store/catalog';

export interface HelpTopic {
  slug: string;
  title: string;
  summary: string;
  body: (c: StoreConfigDTO) => React.ReactNode;
}

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-[15px] leading-relaxed text-muted">{children}</p>;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-[20px] font-semibold tracking-tight text-fg">{children}</h2>;
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted marker:text-subtle">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
);

export const HELP_TOPICS: HelpTopic[] = [
  {
    slug: 'shipping',
    title: 'Shipping & Cash on Delivery',
    summary: 'Delivery times, charges and how COD works.',
    body: (c) => (
      <>
        <P>Orders placed before 4pm (Mon–Sat) are packed the same day. You’ll get tracking on WhatsApp and on our website as soon as the courier picks it up.</P>
        <H>Delivery times</H>
        {c.cities.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-line-subtle">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-2 text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">City</th>
                  <th className="px-4 py-2.5 font-medium">Delivery</th>
                  <th className="px-4 py-2.5 font-medium">COD</th>
                </tr>
              </thead>
              <tbody>
                {c.cities.map((x) => (
                  <tr key={x.city} className="border-t border-line-subtle">
                    <td className="px-4 py-2.5">{x.city}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {x.etaDays}–{x.etaDays + 1} days
                    </td>
                    <td className="px-4 py-2.5 text-muted">{x.cod ? 'Available' : 'Prepaid only'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <P>Everywhere else in India: 3–6 working days, prepaid. Check your pincode on any product page for an exact date.</P>
        <H>Delivery charges</H>
        <P>Free on orders over {formatINR(c.freeShippingOver)}. Below that, a small flat delivery fee is shown at checkout before you pay.</P>
        <H>Cash on Delivery</H>
        <UL
          items={[
            `Available on orders up to ${formatINR(c.codMaxOrder)} in our COD cities.`,
            `A ${formatINR(c.codFee)} COD handling fee applies (some coupons waive it).`,
            'Pay the courier in cash or by UPI at your door.',
            'We confirm every COD order with a quick call or WhatsApp before dispatch.',
          ]}
        />
        <P>Prefer to pay online? You get an extra {c.prepaidDiscountPct}% off on UPI, cards and net banking.</P>
      </>
    ),
  },
  {
    slug: 'returns',
    title: 'Returns & warranty',
    summary: '7-day returns and up to 180 days warranty.',
    body: () => (
      <>
        <P>Every part is tested before it ships, but if something isn’t right we’ll make it right.</P>
        <H>7-day returns</H>
        <UL
          items={[
            'Return any part within 7 days of delivery if it doesn’t fit or you changed your mind — as long as it’s unused and the tamper seal is intact.',
            'Start a return from your tracking page or on WhatsApp. We arrange pickup in COD cities; elsewhere we share a prepaid label.',
            'Refunds go back to the original payment method within 5–7 working days of us receiving the part. COD refunds are sent by UPI or bank transfer.',
          ]}
        />
        <H>Warranty</H>
        <P>Each listing shows its warranty — typically 90 days for Genuine Grade A/B/C and compatible parts, and up to 180 days for new pulls and batteries. Warranty covers functional defects. It doesn’t cover physical or liquid damage, or damage during installation (torn flex cables, cracked glass).</P>
        <H>Dead on arrival</H>
        <P>If a part doesn’t work when you first fit it, WhatsApp us within 48 hours with a short video. We’ll ship a replacement right away — no need to wait for the return.</P>
      </>
    ),
  },
  {
    slug: 'find-your-model',
    title: 'How to find your model number',
    summary: 'The A-number on your Mac, iPhone or iPad.',
    body: () => (
      <>
        <P>Apple devices carry a model number that starts with “A” followed by four digits — for example A2337. It’s the most reliable way to find parts that fit.</P>
        <H>MacBook Air & MacBook Pro</H>
        <P>Turn the laptop over. The model number is printed in small text near the hinge on the bottom case: “Model A2337”. You can also open the Apple menu → About This Mac, but that shows the marketing name (e.g. “MacBook Air (M1, 2020)”), which some models share.</P>
        <H>iMac</H>
        <P>Look under the stand’s foot, or on the back near the ports. On older iMacs it’s on the underside of the stand.</P>
        <H>iPhone</H>
        <P>Go to Settings → General → About and tap the “Model Number” field once — it switches from a part number (MGJ…) to the A-number.</P>
        <H>iPad</H>
        <P>The A-number is printed on the back, at the bottom. Or: Settings → General → About → Model Number (tap to switch).</P>
        <P>
          Still unsure? Search the number on Unibody — e.g.{' '}
          <Link href="/search?q=A2337" className="text-link hover:underline">
            A2337
          </Link>{' '}
          — or send us a photo on WhatsApp.
        </P>
      </>
    ),
  },
  {
    slug: 'grades',
    title: 'Condition grades explained',
    summary: 'New pull, Grade A/B/C and Compatible.',
    body: () => (
      <>
        <P>Every part is inspected and bench-tested before listing. Grades describe cosmetic condition only — all graded parts are fully working.</P>
        <dl className="mt-6 space-y-3">
          {CONDITIONS.map((c) => (
            <div key={c} className="rounded-2xl bg-bg-2 p-4">
              <dt className="font-semibold">{CONDITION_LABEL[c]}</dt>
              <dd className="mt-1 text-sm text-muted">{CONDITION_DESCRIPTION[c]}</dd>
            </div>
          ))}
        </dl>
        <P>“Genuine” means the part was made by or for Apple and pulled from a device. “Compatible” parts are newly manufactured by third parties to the same spec.</P>
      </>
    ),
  },
  {
    slug: 'contact',
    title: 'Contact us',
    summary: 'WhatsApp, phone and hours.',
    body: (c) => (
      <>
        <P>Real technicians answer — usually within 15 minutes, 10am–8pm, Monday to Saturday.</P>
        <UL
          items={[
            <>
              WhatsApp:{' '}
              <a href={waLink(c.whatsapp, 'Hi Unibody')} target="_blank" rel="noreferrer" className="text-link hover:underline">
                Chat with us
              </a>{' '}
              — the fastest way, send photos of your device
            </>,
            <>
              Phone: <a href={`tel:${c.supportPhone.replace(/\s/g, '')}`} className="text-link hover:underline">{c.supportPhone}</a>
            </>,
            <>
              Order questions: have your order number ready, or{' '}
              <Link href="/track" className="text-link hover:underline">
                track it here
              </Link>
            </>,
          ]}
        />
        <P>Repair shops and bulk buyers: ask about GST invoices and trade pricing on WhatsApp.</P>
      </>
    ),
  },
  {
    slug: 'about',
    title: 'About Unibody',
    summary: 'Who we are.',
    body: () => (
      <>
        <P>Unibody is an independent parts store run by repair technicians in Bengaluru. We source genuine parts from donor devices and trusted suppliers, test and grade every unit, and ship across India.</P>
        <P>We started because finding the right part for a 2015 MacBook Pro shouldn’t mean guessing from blurry marketplace photos. Every listing on Unibody tells you exactly which models it fits, what condition it’s in, and how long it’s covered.</P>
      </>
    ),
  },
  {
    slug: 'privacy',
    title: 'Privacy policy',
    summary: 'What we collect and why.',
    body: () => (
      <>
        <P>We collect only what we need to deliver your order and support you: your name, mobile number, delivery address, optional email and GSTIN, and your order history.</P>
        <UL
          items={[
            'Your mobile number is verified by one-time code and used for order updates (SMS/WhatsApp, if you opt in) and support.',
            'Payments are processed by Razorpay. We never see or store your card or bank details.',
            'We share your address and phone with our courier partners solely to deliver your order.',
            'We don’t sell your data or use it for third-party advertising.',
            'Your bag, theme and “My device” preference are stored only in your browser.',
          ]}
        />
        <P>To access or delete your data, message us on WhatsApp from your registered number.</P>
      </>
    ),
  },
  {
    slug: 'terms',
    title: 'Terms of sale',
    summary: 'The small print.',
    body: (c) => (
      <>
        <UL
          items={[
            'All prices are in Indian Rupees and include GST. A tax invoice is issued with every order.',
            'Orders are confirmed once payment is received (prepaid) or once we verify the order by phone/WhatsApp (COD).',
            'You can cancel an order yourself until it is packed. Paid orders are refunded in full.',
            'Compatibility is based on the model numbers listed. Please check your A-number before ordering — we’re happy to confirm on WhatsApp.',
            'Installation is at your own risk; damage during installation isn’t covered by warranty. We recommend a qualified technician for logic boards and displays.',
            'Returns and warranty are covered by our Returns & warranty policy.',
          ]}
        />
        <p className="mt-8 rounded-2xl bg-bg-2 p-4 text-xs leading-relaxed text-muted">{c.disclaimer}</p>
      </>
    ),
  },
];
