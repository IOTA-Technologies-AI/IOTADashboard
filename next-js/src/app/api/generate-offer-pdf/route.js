import React from 'react';
import { NextResponse } from 'next/server';
import ReactPDF from '@react-pdf/renderer';

export async function POST(request) {
  try {
    const formData = await request.json();

    console.log('Generating PDF for:', formData.employeeName);

    // Dynamic import to avoid SSR issues
    const { OfferLetterPDF } = await import('src/components/offer-letter/offer-letter-pdf');

    // Generate PDF buffer on server
    const pdfBuffer = await ReactPDF.renderToBuffer(
      React.createElement(OfferLetterPDF, { data: formData })
    );

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Offer_${formData.contractNumber || 'Letter'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
