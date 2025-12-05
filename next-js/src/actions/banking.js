'use server';

import { supabase } from 'src/lib/supabase';

// ----------------------------------------------------------------------
// BANK ACCOUNTS
// ----------------------------------------------------------------------

export async function fetchBankAccounts(filters = {}) {
  try {
    let query = supabase
      .from('bankAccounts')
      .select('*')
      .order('createdAt', { ascending: false });

    if (filters.region) {
      query = query.eq('region', filters.region);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bank accounts:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchBankAccountById(accountId) {
  try {
    const { data, error } = await supabase
      .from('bankAccounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createBankAccount(accountData) {
  try {
    const { data, error } = await supabase
      .from('bankAccounts')
      .insert([accountData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateBankAccount(accountId, updates) {
  try {
    const { data, error } = await supabase
      .from('bankAccounts')
      .update(updates)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------
// BANK TRANSACTIONS
// ----------------------------------------------------------------------

export async function fetchBankTransactions(filters = {}) {
  try {
    let query = supabase
      .from('bankTransactions')
      .select(`
        *,
        bankAccounts:bankAccountId (
          id, accountName, accountNumber, bankName, currency, region
        )
      `)
      .order('transactionDate', { ascending: false });

    if (filters.accountId) {
      query = query.eq('bankAccountId', filters.accountId);
    }
    if (filters.transactionType) {
      query = query.eq('transactionType', filters.transactionType);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.startDate) {
      query = query.gte('transactionDate', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('transactionDate', filters.endDate);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createBankTransaction(transactionData) {
  try {
    const { data, error } = await supabase
      .from('bankTransactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createBulkTransactions(transactions) {
  try {
    const { data, error } = await supabase
      .from('bankTransactions')
      .insert(transactions)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data, count: data.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateBankTransaction(transactionId, updates) {
  try {
    const { data, error } = await supabase
      .from('bankTransactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteBankTransaction(transactionId) {
  try {
    const { error } = await supabase
      .from('bankTransactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------
// BANK STATEMENTS
// ----------------------------------------------------------------------

export async function createBankStatement(statementData) {
  try {
    const { data, error } = await supabase
      .from('bankStatements')
      .insert([statementData])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchBankStatements(accountId = null) {
  try {
    let query = supabase
      .from('bankStatements')
      .select(`
        *,
        bankAccounts:accountId (id, accountName, accountNumber, bankName)
      `)
      .order('uploadedAt', { ascending: false });

    if (accountId) {
      query = query.eq('accountId', accountId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function generateTransactionNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}
