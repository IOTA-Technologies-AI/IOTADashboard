import ExpenseListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Expense list` };

// No data fetching here. This is a server component, and both bearer-token
// sources are browser-only by design (`extractJWTFromSession` and
// `getLiveAccessToken` return null when `typeof window === 'undefined'`), so a
// fetch made here cannot authenticate. It used to work only because /expenses
// was unauthenticated; once the gateway auth handler landed it returned 401 on
// every request, and the catch below turned that into an empty array — so the
// page rendered blank with no error in the console and no request in the
// Network tab. ExpenseListView now loads the list on mount instead.
export default function Page() {
  return <ExpenseListWrapper />;
}
