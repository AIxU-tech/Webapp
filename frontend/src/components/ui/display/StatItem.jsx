/**
 * StatItem Component
 *
 * Displays a statistic with value and label, centered.
 */

const SIZES = {
  sm: {
    value: 'text-lg font-bold',
    label: 'text-xs',
  },
  md: {
    value: 'text-xl font-bold',
    label: 'text-xs',
  },
  lg: {
    value: 'text-3xl md:text-4xl font-bold',
    label: 'text-sm mt-1',
  },
};

export default function StatItem({ value, label, size = 'md' }) {
  const config = SIZES[size] || SIZES.md;

  return (
    <div className="text-center">
      <div className={`text-foreground ${config.value}`}>{value}</div>
      <div className={`text-muted-foreground ${config.label}`}>{label}</div>
    </div>
  );
}
