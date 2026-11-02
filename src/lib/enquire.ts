import type { LeadEntity } from './leads'

/**
 * Entity-specific CTAs ("Узнай стоимость" 5.7.5, "Узнать больше о проекте" 5.10.1 …)
 * open the header enquiry 0.1-b with their own context, so every lead says where it came from.
 */
export type EnquireDetail = { context: string; entity?: LeadEntity }

export const ENQUIRE_EVENT = 'idp:enquire'

export function openEnquiry(detail: EnquireDetail) {
  window.dispatchEvent(new CustomEvent<EnquireDetail>(ENQUIRE_EVENT, { detail }))
}
