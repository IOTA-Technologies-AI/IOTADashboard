import { NextResponse } from 'next/server';

import { SUPPORTED_BANKS, getCurrencyByRegion } from 'src/utils/constants/banking';

import { supabase } from 'src/lib/supabase';
import { parseStatement, detectBank } from 'src/services/bank-statement-parser';

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

    let pdfText = '';
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const options = password ? { password } : {};
      const pdfData = await pdfParse(buffer, options);
      pdfText = pdfData.text;
    } catch (pdfError) {
      if (pdfError.message?.includes('password')) {
        return NextResponse.json({ error: 'Invalid password for encrypted PDF' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 400 });
    }

    const detectedBankId = bankId || detectBank(pdfText);
    if (!detectedBankId) {
      return NextResponse.json({ error: 'Unable to detect bank. Please select manually.' }, { status: 400 });
    }

    let parsedStatement;
    try {
      parsedStatement = parseStatement(pdfText, detectedBankId);
    } catch (parseError) {
      return NextResponse.json({ error: parseError.message }, { status: 400 });
    }

    let finalAccountId = accountId;

    if (isNewAccount || !accountId) {
      const bankInfo = SUPPORTED_BANKS[region]?.find((b) => b.id === detectedBankId);
      const currency = getCurrencyByRegion(region);

      const newAccountData = {
        accountNumber: parsedStatement.accountInfo.accountNumber,
        accountName: parsedStatement.accountInfo.accountName || `${bankInfo?.name || 'Bank'} Account`,
        bankName: bankInfo?.name || parsedStatement.bankName,
        bankId: detectedBankId,
        iban: parsedStatement.accountInfo.iban || '',
        accountType: 'current',
        branchName: parsedStatement.accountInfo.branchName || '',
        region,
        currency: currency.code,
        currentBalance: parsedStatement.statementInfo.closingBalance || 0,
        status: 'active',
      };

      const { data: existingAccount } = await supabase
        .from('bankAccounts')
        .select('id')
        .eq('accountNumber', newAccountData.accountNumber)
        .single();

      if (existingAccount) {
        finalAccountId = existingAccount.id;
        await supabase.from('bankAccounts').update({ currentBalance: newAccountData.currentBalance }).eq('id', finalAccountId);
      } else {
        const { data: createdAccount, error: createError } = await supabase
          .from('bankAccounts')
          .insert([newAccountData])
          .select()
          .single();

        if (createError) {
          return NextResponse.json({ error: 'Failed to create account: ' + createError.message }, { status: 500 });
        }
        finalAccountId = createdAccount.id;
      }
    }

    // Create statement record
    const statementData = {
      accountId: finalAccountId,
      fileName: file.name,
      periodStart: parsedStatement.statementInfo.periodStart,
      periodEnd: parsedStatement.statementInfo.periodEnd,
      openingBalance: parsedStatement.statementInfo.openingBalance,
      closingBalance: parsedStatement.statementInfo.closingBalance,
      transactionCount: parsedStatement.transactions.length,
      parserUsed: detectedBankId,
    };

    const { data: statement } = await supabase.from('bankStatements').insert([statementData]).select().single();

    // Prepare transactions
    const transactionsToInsert = parsedStatement.transactions.map((txn, index) => ({
      transactionNumber: `TXN-${Date.now()}-${index}`,
      bankAccountId: finalAccountId,
      transactionDate: txn.transactionDate,
      transactionType: txn.transactionType,
      category: txn.category,
      amount: txn.amount || txn.credit || txn.debit,
      credit: txn.credit || 0,
      debit: txn.debit || 0,
      balanceAfter: txn.balance,
      description: txn.description,
      counterparty: txn.counterparty || '',
      statementId: statement?.id,
      reconciled: false,
    }));

    // Check duplicates
    const { data: existingTxns } = await supabase
      .from('bankTransactions')
      .select('transactionDate, amount, description')
      .eq('bankAccountId', finalAccountId);

    const existingSet = new Set(
      (existingTxns || []).map((t) => `${t.transactionDate}-${t.amount}-${t.description?.substring(0, 50)}`)
    );

    const newTransactions = transactionsToInsert.filter(
      (t) => !existingSet.has(`${t.transactionDate}-${t.amount}-${t.description?.substring(0, 50)}`)
    );

    let insertedCount = 0;
    if (newTransactions.length > 0) {
      const { data: insertedTxns, error: insertError } = await supabase
        .from('bankTransactions')
        .insert(newTransactions)
        .select();

      if (insertError) {
        return NextResponse.json({ error: 'Failed to save transactions: ' + insertError.message }, { status: 500 });
      }
      insertedCount = insertedTxns?.length || 0;
    }

    return NextResponse.json({
      success: true,
      bankId: detectedBankId,
      bankName: parsedStatement.bankName,
      accountId: finalAccountId,
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
