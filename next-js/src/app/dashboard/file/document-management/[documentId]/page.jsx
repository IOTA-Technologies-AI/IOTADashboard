import DocumentDetailsWrapper from './details-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: 'Document | Document Management' };

export default async function Page({ params }) {
  const { documentId } = await params;
  return <DocumentDetailsWrapper documentId={documentId} />;
}
