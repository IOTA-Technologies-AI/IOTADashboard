import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

import { RouterLink } from 'src/routes/components';

import { paths } from 'src/routes/paths';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function VATTableRow({ row, visibleColumns }) {
  // When no selection is passed, show every column (backwards-safe default).
  const show = (id) => !Array.isArray(visibleColumns) || visibleColumns.includes(id);
  const {
    invoice_number,
    invoiceNumber,
    date,
    createDate,
    customer_name,
    invoiceTo,
    country,
    currency,
    baseAmount,
    vatRatePercent,
    vatAmount,
    totalWithVAT,
    type,
    isVATApplicable,
    vatTaxPeriod,
  } = row;

  // Handle different field names from AR/AP sources
  const displayInvoiceNumber = invoice_number || invoiceNumber || '-';
  const displayDate = date || createDate;
  const displayCountry = country || 'N/A';

  // Check if this is an expense entry
  const isExpense = displayInvoiceNumber.startsWith('EXP-');
  const expenseReferenceId = isExpense ? displayInvoiceNumber.replace('EXP-', '') : null;

  // For AR records, build a link to the Invoice detail page
  const arInvoiceHref =
    !isExpense && row.invoice_id ? paths.dashboard.invoice.details(row.invoice_id) : null;

  // Truncate invoice number after 3 words and add ellipsis
  const truncateInvoiceNumber = (invoiceNum) => {
    if (!invoiceNum || invoiceNum === '-') return invoiceNum;
    const words = invoiceNum.split(/[\s-]+/);
    if (words.length > 3) {
      return `${words.slice(0, 3).join('-')}...`;
    }
    return invoiceNum;
  };

  const truncatedInvoiceNumber = truncateInvoiceNumber(displayInvoiceNumber);

  // Determine hover background color based on type
  const getHoverBackgroundColor = () => {
    if (type === 'AP') return 'rgba(255, 0, 0, 0.08)'; // Pale red for AP on hover
    if (type === 'AR') return 'rgba(0, 255, 0, 0.08)'; // Pale green for AR on hover
    return 'rgba(0, 0, 0, 0.04)'; // Default hover color
  };

  return (
    <TableRow
      hover
      sx={{
        '&:hover': {
          backgroundColor: getHoverBackgroundColor(),
        },
      }}
    >
      {/* Invoice Number - Truncated and Clickable */}
      {show('invoiceNumber') && (
        <TableCell>
          {isExpense && expenseReferenceId ? (
            <Link
              component={RouterLink}
              href={`/dashboard/expense/${expenseReferenceId}`}
              color="inherit"
              underline="always"
              sx={{ cursor: 'pointer' }}
              title={displayInvoiceNumber}
            >
              {truncatedInvoiceNumber}
            </Link>
          ) : arInvoiceHref ? (
            <Link
              component={RouterLink}
              href={arInvoiceHref}
              color="inherit"
              underline="always"
              sx={{ cursor: 'pointer' }}
              title={displayInvoiceNumber}
            >
              {truncatedInvoiceNumber}
            </Link>
          ) : (
            <Link
              color="inherit"
              underline="always"
              sx={{ cursor: 'pointer' }}
              title={displayInvoiceNumber}
            >
              {truncatedInvoiceNumber}
            </Link>
          )}
        </TableCell>
      )}

      {/* Date */}
      {show('date') && <TableCell>{displayDate ? fDate(displayDate) : '-'}</TableCell>}

      {/* Customer/Vendor column removed as requested */}

      {/* Country */}
      {show('country') && <TableCell>{displayCountry}</TableCell>}

      {/* Currency */}
      {show('currency') && (
        <TableCell>
          <Chip label={currency || 'SAR'} size="small" variant="soft" />
        </TableCell>
      )}

      {/* Base Amount */}
      {show('amount') && (
        <TableCell align="right">
          {fCurrency(baseAmount || 0, { currency: currency || 'SAR' })}
        </TableCell>
      )}

      {/* VAT Rate */}
      {show('vatRate') && (
        <TableCell align="center">
          {isVATApplicable ? (
            <Label color="info">{vatRatePercent?.toFixed(0)}%</Label>
          ) : (
            <Label color="default">0%</Label>
          )}
        </TableCell>
      )}

      {/* VAT Amount */}
      {show('vatAmount') && (
        <TableCell align="right">
          <Box
            sx={{ fontWeight: 'bold', color: isVATApplicable ? 'error.main' : 'text.secondary' }}
          >
            {fCurrency(vatAmount || 0, { currency: currency || 'SAR' })}
          </Box>
        </TableCell>
      )}

      {/* Total with VAT */}
      {show('total') && (
        <TableCell align="right">
          {fCurrency(totalWithVAT || baseAmount || 0, { currency: currency || 'SAR' })}
        </TableCell>
      )}

      {/* Type */}
      {show('type') && (
        <TableCell>
          <Label variant="soft" color={type === 'AR' ? 'info' : 'warning'}>
            {type}
          </Label>
        </TableCell>
      )}

      {/* ZATCA Status */}
      {show('vatPosted') && (
        <TableCell>
          {vatTaxPeriod ? (
            <Label variant="soft" color="success" title={`Posted in ${vatTaxPeriod}`}>
              Posted
            </Label>
          ) : (
            <Label variant="soft" color="default">
              Pending
            </Label>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
