export const metadata = {
  title: 'IOTA Brand Guidelines',
};

export default function Page() {
  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div>
        <p style={{ opacity: 0.72, letterSpacing: '0.08em', textTransform: 'uppercase' }}>IOTA</p>
        <h1 style={{ margin: '0.5rem 0 1rem', fontSize: '2rem' }}>Brand Guidelines</h1>
        <p style={{ maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
          Centralized hub for logos, colors, and usage rules. Please reach out to
          tech@iotatechnologies.ai to request access to the latest brand kit.
        </p>
      </div>
    </main>
  );
}
