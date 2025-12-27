export function GreetingCard({ name }: { name: string }) {
  return (
    <div
      style={{
        padding: '2rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}
    >
      <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
        Hello, {name}!
      </h1>
      <p style={{ margin: 0, opacity: 0.9 }}>
        This UI was server-rendered via React Server Components.
      </p>
    </div>
  );
}
