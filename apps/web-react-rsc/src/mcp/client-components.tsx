/**
 * Pre-bundled Client Components for MCP Apps
 *
 * This module exports all client components that may be referenced in RSC payloads.
 * These are bundled into the MCP App bootstrap so they're available for hydration.
 *
 * When adding new client components:
 * 1. Create the component with 'use client' directive
 * 2. Export it from this file
 * 3. Rebuild the MCP bootstrap
 */

'use client';

// Re-export the existing ClientCounter component
export { ClientCounter } from '../client.tsx';

// Interactive button component for MCP Apps
export function InteractiveButton({
  children,
  onClick,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const baseStyles: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--primary, #0066cc)',
      color: 'white',
    },
    secondary: {
      background: 'var(--muted, #e0e0e0)',
      color: 'var(--foreground, #000)',
    },
  };

  return (
    <button
      style={{ ...baseStyles, ...variantStyles[variant] }}
      onClick={onClick}
      onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
      onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}

// Form input component for MCP Apps
export function FormInput({
  label,
  name,
  type = 'text',
  placeholder,
  defaultValue,
  onChange,
}: {
  label?: string;
  name: string;
  type?: 'text' | 'email' | 'number';
  placeholder?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--border, #ccc)',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const labelStyles: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: '0.875rem',
    color: 'var(--foreground, #000)',
  };

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      {label && <label style={labelStyles}>{label}</label>}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        style={inputStyles}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}
