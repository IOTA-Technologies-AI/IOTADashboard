import { NextResponse } from 'next/server';

import { SUPPORTED_BANKS, getCurrencyByRegion } from 'src/utils/constants/banking';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';
const PDF_PARSER_URL = process.env.PDF_PARSER_URL || 'https://iota-pdf-parser.onrender.com';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const password = formData.get('password') || '';
    const accountId = formData.get('accountId');
    const bankId = formData.get('bankId');
    const region = formData.get('region') || 'UAE';
    const isNewAccount = formData.get('isNewAccount') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

        const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Call Python PDF parser service
    console.log('Calling Python PDF parser service...');
    const pythonFormData = new FormData();
    pythonFormData.append('file', new Blob([buffer], { type: 'application/pdf' }), file.name);
    pythonFormData.append('bank', bankId || 'emirates_nbd');
    if (password) {
      pythonFormData.append('password', password);
    }

    let parsedStatement;
    try {
      const pythonResponse = await fetch(`${PDF_PARSER_URL}/parse`, {
        method: 'POST',
        body: pythonFormData,
      });

      if (!pythonResponse.ok) {
        const errorData = await pythonResponse.json().catch(() => ({}));
        return NextResponse.json(
          { error: 'PDF parsing failed: ' + (errorData.error || 'Unknown error') },
          { status: 400 }
        );
      }

      parsedStatement = await pythonResponse.json();
      console.log('Python parser result:', JSON.stringify(parsedStatement, null, 2));

      if (!parsedStatement.accountInfo || !parsedStatement.statementInfo) {
        return NextResponse.json(
          { error: 'Invalid parser response: missing required data' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('Python PDF Parser Error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse PDF: ' + (parseError.message || 'Parser service unavailable') },
        { status: 500 }
      );
    }

    const detectedBankId = bankId || parsedStatement.bankId || 'emirates_nbd';

    let finalAccountId = accountId;

    if (isNewAccount || !accountId) {
      const bankInfo = SUPPORTED_BANKS[region]?.find((b) => b.id === detectedBankId);
      const currency = getCurrencyByRegion(region);

      const newAccountData = {
        accountNumber: (parsedStatement.accountInfo.accountNumber || '').substring(0, 100),
        accountName: (
          parsedStatement.accountInfo.accountName || `${bankInfo?.name || 'Bank'} Account`
        ).substring(0, 200),
        bankName: (bankInfo?.name || parsedStatement.bankName || '').substring(0, 100),
        accountType: 'current',
        branchName: (parsedStatement.accountInfo.branchName || '').substring(0, 200),
        iban: (parsedStatement.accountInfo.iban || '').substring(0, 50),
        region,
        currency: currency.code,
        openingBalance: parsedStatement.statementInfo.openingBalance || 0,
        openingDate:
          parsedStatement.statementInfo.periodStart || new Date().toISOString().split('T')[0],
        status: 'active',
      };

      // Check if account already exists
      const existingResponse = await fetch(`${API_BASE_URL}/bankAccounts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const existingResult = await existingResponse.json();
      const existingAccount = (existingResult.data || []).find(
        (acc) => acc.accountNumber === newAccountData.accountNumber
      );

      if (existingAccount) {
        finalAccountId = existingAccount.id;
        // Update balance
        await fetch(`${API_BASE_URL}/bankAccounts/${finalAccountId}/balance`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: finalAccountId,
            newBalance: parsedStatement.statementInfo.closingBalance || 0,
          }),
        });
      } else {
        // Create new account
        const createResponse = await fetch(`${API_BASE_URL}/bankAccounts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAccountData),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          return NextResponse.json(
            { error: 'Failed to create account: ' + (errorData.message || 'Unknown error') },
            { status: 500 }
          );
        }

        const createdResult = await createResponse.json();
        finalAccountId = createdResult.data?.id;
      }
    }

    // Check for duplicate statement (same period for same account)
    const existingStatementsResponse = await fetch(
      `${API_BASE_URL}/bankStatements/account/${finalAccountId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (existingStatementsResponse.ok) {
      const existingStatementsResult = await existingStatementsResponse.json();
      const existingStatements = existingStatementsResult.data || [];

      const startDate = parsedStatement.statementInfo.periodStart || new Date().toISOString().split('T')[0];
      const endDate = parsedStatement.statementInfo.periodEnd || new Date().toISOString().split('T')[0];

      const duplicateStatement = existingStatements.find(
        (stmt) => stmt.startDate === startDate && stmt.endDate === endDate
      );

      if (duplicateStatement) {
        return NextResponse.json(
          {
            error: 'Duplicate statement',
            message: `A statement for the period ${startDate} to ${endDate} has already been uploaded`,
            isDuplicate: true,
            existingStatementId: duplicateStatement.id,
            existingStatement: {
              id: duplicateStatement.id,
              fileName: duplicateStatement.fileName,
              uploadedAt: duplicateStatement.createdAt,
              transactionCount: duplicateStatement.transactionCount,
            },
          },
          { status: 409 }
        );
      }
    }

    // Create statement record
        const statementData = {
      bankAccountId: finalAccountId,
      fileName: file.name,
      statementDate:
        parsedStatement.statementInfo.periodEnd || new Date().toISOString().split('T')[0],
      startDate:
        parsedStatement.statementInfo.periodStart || new Date().toISOString().split('T')[0],
      endDate: parsedStatement.statementInfo.periodEnd || new Date().toISOString().split('T')[0],
      openingBalance: parsedStatement.statementInfo.openingBalance || 0,
      closingBalance: parsedStatement.statementInfo.closingBalance || 0,
      totalCredits: parsedStatement.transactions
        .filter((t) => t.transactionType === 'credit')
        .reduce((sum, t) => sum + (t.credit || t.amount || 0), 0),
      totalDebits: parsedStatement.transactions
        .filter((t) => t.transactionType === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.debit || t.amount || 0), 0),
      transactionCount: parsedStatement.transactions.length,
    };

    console.log('Creating statement with data:', JSON.stringify(statementData, null, 2));

    const statementResponse = await fetch(`${API_BASE_URL}/bankStatements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(statementData),
    });

    let statementId = null;
    if (statementResponse.ok) {
      const statementResult = await statementResponse.json();
      statementId = statementResult.data?.id;
      console.log('Statement created with ID:', statementId);
    } else {
      const errorText = await statementResponse.text();
      console.error('Statement creation failed:', statementResponse.status, errorText);
    }
    // Upload file to OneDrive
    let fileUrl = null;
    try {
      const base64Content = buffer.toString('base64');
      const uploadPath = `Banking/Statements/${region}`;
      const uploadResponse = await fetch(`${API_BASE_URL}/onedrive/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: uploadPath,
          fileName: file.name,
          fileContent: base64Content,
          userId: 'jaffar@aborouman.com', // Your Microsoft 365 email
        }),
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        fileUrl = uploadResult.webUrl;
        console.log('File uploaded to OneDrive:', fileUrl);
      } else {
        console.error('OneDrive upload failed:', await uploadResponse.text());
      }
    } catch (uploadError) {
      console.error('OneDrive upload error:', uploadError);
      // Don't fail the whole request if OneDrive upload fails
    }
    // Prepare transactions
    const transactionsToInsert = parsedStatement.transactions.map((txn, index) => ({
      bankAccountId: finalAccountId,
      statementId,
      transactionDate: txn.transactionDate,
      valueDate: txn.valueDate || txn.transactionDate,
      transactionType: txn.transactionType,
      category: txn.category,
      amount:
        txn.transactionType === 'credit'
          ? txn.credit || txn.amount || 0
          : -(txn.debit || Math.abs(txn.amount) || 0),
      balanceAfter: txn.balance,
      description: txn.description,
      rawDescription: txn.rawDescription || txn.description,
      counterpartyName: txn.counterparty || '',
      referenceNumber: txn.referenceNumber || '',
      chequeNumber: txn.chequeNumber || '',
    }));

    // Check for duplicates by fetching existing transactions
    const existingTxnsResponse = await fetch(
      `${API_BASE_URL}/bankTransactions/account/${finalAccountId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const existingTxnsResult = await existingTxnsResponse.json();
    const existingTxns = existingTxnsResult.data || [];

    const existingSet = new Set(
      existingTxns.map((t) => `${t.transactionDate}-${t.amount}-${t.description?.substring(0, 50)}`)
    );

    const newTransactions = transactionsToInsert.filter(
      (t) => !existingSet.has(`${t.transactionDate}-${t.amount}-${t.description?.substring(0, 50)}`)
    );

    let insertedCount = 0;
    if (newTransactions.length > 0) {
      const bulkResponse = await fetch(`${API_BASE_URL}/bankTransactions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: newTransactions }),
      });

      if (!bulkResponse.ok) {
        const errorData = await bulkResponse.json().catch(() => ({}));
        // Update statement status to failed
        if (statementId) {
          await fetch(`${API_BASE_URL}/bankStatements/${statementId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: statementId,
              status: 'failed',
              errorMessage: errorData.message || 'Failed to save transactions',
            }),
          });
        }
        return NextResponse.json(
          { error: 'Failed to save transactions: ' + (errorData.message || 'Unknown error') },
          { status: 500 }
        );
      }

      const bulkResult = await bulkResponse.json();
      insertedCount = bulkResult.data?.length || 0;
    }

    // Update statement status to completed
    if (statementId) {
      await fetch(`${API_BASE_URL}/bankStatements/${statementId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: statementId, status: 'completed' }),
      });
    }

    // Update account balance to closing balance
    if (finalAccountId) {
      await fetch(`${API_BASE_URL}/bankAccounts/${finalAccountId}/balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: finalAccountId,
          newBalance: parsedStatement.statementInfo.closingBalance || 0,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      bankId: detectedBankId,
      bankName: parsedStatement.bankName,
      accountId: finalAccountId,
      statementId,
      accountInfo: parsedStatement.accountInfo,
      statementInfo: parsedStatement.statementInfo,
      transactions: parsedStatement.transactions,
      summary: {
        totalTransactions: parsedStatement.transactions.length,
        newTransactions: insertedCount,
        duplicatesSkipped: parsedStatement.transactions.length - newTransactions.length,
      },
    });
  } catch (error) {
    console.error('Statement upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
