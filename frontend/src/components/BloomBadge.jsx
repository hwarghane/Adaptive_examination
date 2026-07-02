const BLOOM_COLORS = {
  Remember:   'bg-gray-100 text-gray-700',
  Understand: 'bg-blue-100 text-blue-700',
  Apply:      'bg-yellow-100 text-yellow-700',
  Analyze:    'bg-orange-100 text-orange-700',
  Evaluate:   'bg-purple-100 text-purple-700',
  Create:     'bg-red-100 text-red-700',
};

export default function BloomBadge({ level, size = 'sm' }) {
  const cls = BLOOM_COLORS[level] || 'bg-gray-100 text-gray-600';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span className={`badge ${cls} ${textSize} font-medium`}>{level}</span>
  );
}
