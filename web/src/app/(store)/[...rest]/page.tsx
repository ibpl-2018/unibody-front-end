import { notFound } from 'next/navigation';

/** Any unmatched storefront URL renders the store's not-found page (with store chrome). */
export default function CatchAll() {
  notFound();
}
