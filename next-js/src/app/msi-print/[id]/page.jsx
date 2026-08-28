'use client';

import { useRef, useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { getMsiRequest } from 'src/utils/apiHelper';

// ─────────────────────────────────────────────────────────────────────────────
// How this page works:
//   1. Fetches /public/assets/template/IOTA MSI Letter Template.html
//   2. Fetches the approved increment from the API
//   3. Replaces every {{PLACEHOLDER}} with real values
//   4. Writes the filled HTML into an iframe and opens the print dialog
//
// To change the letter's layout or styles, edit only:
//   next-js/public/assets/template/IOTA MSI Letter Template.html
//
// Append ?preview=1 to inspect the letter without the print dialog opening.
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY_NAME = 'IOTA Technologies';
const COMPANY_ADDRESS = '2885, Office #9, Jarir Street, AlMalaz, Riyadh 12836';
const HR_SIGNATORY_NAME = '[HR SIGNATORY NAME]';
const HR_SIGNATORY_TITLE = 'Head of Human Resources';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (v) =>
  num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1 September 2026" — the effective date as the letter's prose reads it. */
const fLongDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })} ${d.getUTCFullYear()}`;
};

/** "26 AUG 2026" — the header's issue date. */
const fShortDate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  return `${String(d.getUTCDate()).padStart(2, '0')} ${month} ${d.getUTCFullYear()}`;
};

// Escape anything that came from a database field before it goes into markup.
const esc = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * A component row is printed only when it carries a figure on either side, so
 * an employee with no "other allowances" gets a three-row table rather than a
 * row of zeros. Housing carries its share of basic in the label, as the design
 * sets it, but only when that share is a clean figure worth stating.
 */
function buildRows(msi) {
  const basic = num(msi.revisedBasic);
  const housingShare = basic > 0 ? (num(msi.revisedHousing) / basic) * 100 : 0;
  const housingLabel =
    housingShare > 0 && Math.abs(housingShare - Math.round(housingShare)) < 0.05
      ? `Housing Allowance (${Math.round(housingShare)}% of basic)`
      : 'Housing Allowance';

  const components = [
    { label: 'Basic Salary', current: msi.currentBasic, revised: msi.revisedBasic },
    { label: housingLabel, current: msi.currentHousing, revised: msi.revisedHousing },
    {
      label: 'Transportation Allowance',
      current: msi.currentTransport,
      revised: msi.revisedTransport,
    },
    { label: 'Other Allowances', current: msi.currentOther, revised: msi.revisedOther },
  ];

  return components
    .filter((c) => num(c.current) > 0 || num(c.revised) > 0)
    .map((c) => {
      const current = num(c.current);
      const revised = num(c.revised);
      const delta = revised - current;
      // A component that did not move says so, rather than showing "+0.0%".
      let change = '—';
      if (delta !== 0) {
        change =
          current > 0
            ? `${delta > 0 ? '+' : ''}${((delta / current) * 100).toFixed(1)}%`
            : `${delta > 0 ? '+' : ''}${fmt(delta)}`;
      }
      return `        <div class="trow">
          <div class="tlabel">${esc(c.label)}</div>
          <div class="mono tcurrent">${fmt(current)}</div>
          <div class="mono trevised">${fmt(revised)}</div>
          <div class="mono tchange">${change}</div>
        </div>`;
    })
    .join('\n');
}

function fillTemplate(templateHtml, msi) {
  const currentGross = num(msi.currentGross);
  const revisedGross = num(msi.revisedGross);
  const grossDelta = revisedGross - currentGross;
  const firstName = String(msi.employeeName || '').trim().split(/\s+/)[0] || 'Colleague';

  const values = {
    COMPANY_NAME,
    COMPANY_ADDRESS,
    REF_NO: msi.letterRef || `#${msi.id}`,
    LETTER_DATE: fShortDate(msi.updatedAt || msi.createdAt),
    EMPLOYEE_NAME: msi.employeeName || '',
    DESIGNATION: msi.designation || '—',
    DEPARTMENT: msi.department || '—',
    EMPLOYEE_ID: msi.employeeCode || `#${msi.employeeId}`,
    SALUTATION_NAME: firstName,
    EFFECTIVE_DATE: fLongDate(msi.effectiveDate),
    COMPONENT_ROWS: buildRows(msi),
    GROSS_CURRENT: fmt(currentGross),
    GROSS_REVISED: fmt(revisedGross),
    GROSS_CHANGE: `${grossDelta > 0 ? '+' : ''}${fmt(grossDelta)}`,
    INCREASE_PCT: `${num(msi.increasePercent).toFixed(1)}%`,
    HR_SIGNATORY_NAME,
    HR_SIGNATORY_TITLE,
  };

  let html = templateHtml;
  Object.entries(values).forEach(([key, value]) => {
    // COMPONENT_ROWS is markup this page built; everything else is escaped.
    const safe = key === 'COMPONENT_ROWS' ? value : esc(value);
    html = html.split(`{{${key}}}`).join(safe);
  });
  return html;
}

export default function MsiPrintPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';

  const iframeRef = useRef(null);
  const writtenRef = useRef(false);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [letterRef, setLetterRef] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/assets/template/IOTA MSI Letter Template.html').then((r) => r.text()),
      getMsiRequest(id),
    ])
      .then(([template, { request }]) => {
        if (!active) return;
        if (!request) {
          setError('Increment not found.');
          return;
        }
        // The letter states an approved decision as fact, so it must not be
        // printable before one exists.
        if (request.status !== 'approved') {
          setError('This increment has not been approved, so no letter can be issued yet.');
          return;
        }
        setLetterRef(request.letterRef || '');
        setHtml(fillTemplate(template, request));
      })
      .catch((e) => {
        console.error('Failed to build MSI letter', e);
        if (active) setError('Failed to load the increment letter.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!html || !iframeRef.current) return;
    // Guard against a second write: React's dev double-invoke would call
    // doc.open() on the document the print dialog is rendering.
    if (writtenRef.current) return;
    writtenRef.current = true;

    document.title = letterRef || 'IOTA Salary Increment Letter';

    const iframe = iframeRef.current;

    const write = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;
      doc.open();
      doc.write(html);
      doc.close();

      if (isPreview) return;

      // Print only once the letter has everything it draws with — the webfonts
      // and the logo decode separately, and printing ahead of them drops them.
      const imagesReady = Promise.all(
        Array.from(doc.images || []).map(
          (img) =>
            img.complete ||
            new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
        )
      );
      const assetsReady = Promise.all([doc.fonts ? doc.fonts.ready : null, imagesReady]);
      // A font or image that never resolves must not swallow the print dialog.
      const deadline = new Promise((resolve) => setTimeout(resolve, 4000));

      Promise.race([assetsReady, deadline]).then(() => {
        setTimeout(() => iframe.contentWindow?.print(), 250);
      });
    };

    if (iframe.contentDocument) {
      write();
    } else {
      iframe.addEventListener('load', write, { once: true });
    }
  }, [html, letterRef, isPreview]);

  if (error || !html) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'sans-serif',
          fontSize: 16,
          color: error ? '#b42318' : '#555',
          padding: 24,
          textAlign: 'center',
        }}
      >
        {error || 'Preparing letter…'}
      </div>
    );
  }

  // Rendered inside an iframe so the template's @page rules are not polluted
  // by Next.js's own <html>/<body> wrapping.
  return (
    <iframe
      ref={iframeRef}
      title="msi-letter-print"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#e8e8e8',
      }}
    />
  );
}
