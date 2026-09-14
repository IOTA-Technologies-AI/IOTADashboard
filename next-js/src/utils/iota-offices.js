/**
 * The executing IOTA entity for an agreement, keyed by appConfig configKey
 * (namespace 'iotaOffice').
 *
 * An NDA or partnership agreement is executed by one legal entity. That entity
 * decides three things that must never disagree with each other on a signed
 * document:
 *
 *   1. the company stamp embedded on the page,
 *   2. the legal name and place of registration in the Parties clause,
 *   3. the governing law and forum in the General Provisions clause.
 *
 * Keeping them in one record is deliberate: a UAE-stamped agreement that says
 * it is governed by Saudi law is a defective instrument, and previously all
 * three were hardcoded to the Saudi entity in four separate files.
 *
 * India and the UK are real offices but are not executing agreements — no stamp
 * artwork, and empty registration numbers in appConfig. They are listed so the
 * picker shows the whole company, but stamping is refused rather than silently
 * falling back to another entity's stamp.
 *
 * Addresses and registration numbers agree with IOTA_OFFICES in
 * src/sections/invoice/invoice-create-edit-address.jsx, which is the same data
 * used on invoices.
 *
 * ⚠ The `governingLaw` / `courts` / `legalName` wording is contract text. Changing
 * it changes what the counterparty signs. Legal sign-off before edits.
 */

/** Office used for agreements created before iotaOffice existed. */
export const DEFAULT_IOTA_OFFICE = 'iota-saudi';

const OFFICES = {
  'iota-saudi': {
    label: 'IOTA Saudi Arabia',
    stamp: '/logo/iota-stamp.png',
    legalName: 'IOTA Technologies Company',
    registeredIn: 'the Kingdom of Saudi Arabia',
    registrationNumber: '7050457477',
    governingLaw: 'the Kingdom of Saudi Arabia',
    courts: 'Riyadh, Saudi Arabia',
  },
  'iota-uae': {
    label: 'IOTA UAE',
    stamp: '/logo/iota-stamp-uae.png',
    legalName: 'IOTA Information Technology Services',
    registeredIn: 'the United Arab Emirates',
    registrationNumber: '1100858',
    governingLaw: 'the United Arab Emirates',
    courts: 'Dubai, United Arab Emirates',
  },
  'iota-india': {
    label: 'IOTA India',
    stamp: null,
  },
  'iota-uk': {
    label: 'IOTA UK',
    stamp: null,
  },
};

/** @param {string | null | undefined} office */
function officeRecord(office) {
  return OFFICES[office || DEFAULT_IOTA_OFFICE] ?? OFFICES[DEFAULT_IOTA_OFFICE];
}

/**
 * Asset path for an office's stamp, or null when that office has none.
 * @param {string | null | undefined} office appConfig configKey
 * @returns {string | null}
 */
export function stampForOffice(office) {
  return officeRecord(office).stamp ?? null;
}

/**
 * Whether this office can stamp. Use to gate placement controls so a document
 * cannot be marked as stamped when no artwork exists for its entity.
 * @param {string | null | undefined} office
 */
export function officeCanStamp(office) {
  return stampForOffice(office) !== null;
}

/** Offices that have stamp artwork — used to annotate the office picker. */
export function officesWithStamps() {
  return Object.keys(OFFICES).filter((key) => OFFICES[key].stamp);
}

/**
 * Message for an office that cannot stamp, suitable for a disabled control.
 * @param {string} label human-readable office label, e.g. "IOTA India"
 */
export function noStampReason(label) {
  return `No company stamp is configured for ${label}. Agreements executed from this office cannot be stamped yet.`;
}

/**
 * The Parties-clause description of the disclosing entity, e.g.
 * "IOTA Technologies Company, a company registered in the Kingdom of Saudi Arabia".
 *
 * Offices with no contract details fall back to the default entity so an
 * existing document never renders a blank party — those offices are blocked
 * from stamping, which is where the guard belongs.
 *
 * @param {string | null | undefined} office
 */
export function disclosingPartyFor(office) {
  const rec = officeRecord(office);
  const entity = rec.legalName ? rec : OFFICES[DEFAULT_IOTA_OFFICE];
  return `${entity.legalName}, a company registered in ${entity.registeredIn}`;
}

/**
 * The Governing Law clause body for an office, without its leading number —
 * both templates and the section-override editor render it the same way.
 * @param {string | null | undefined} office
 */
export function governingLawFor(office) {
  const rec = officeRecord(office);
  const entity = rec.governingLaw ? rec : OFFICES[DEFAULT_IOTA_OFFICE];
  return (
    `This Agreement shall be governed by and construed in accordance with the laws of ` +
    `${entity.governingLaw}. Any dispute arising out of or in connection with this Agreement ` +
    `shall be subject to the exclusive jurisdiction of the courts of ${entity.courts}.`
  );
}

/**
 * Display label for an office key. appConfig is the source of truth for labels
 * at runtime; this is the fallback when a record has been loaded without it.
 * @param {string | null | undefined} office
 */
export function officeLabel(office) {
  return officeRecord(office).label ?? office ?? DEFAULT_IOTA_OFFICE;
}
