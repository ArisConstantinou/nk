import {Check, ChevronDown, X} from 'lucide-react';

export type ProductFilterKey = 'category' | 'space' | 'season';

export type CompactFilterSelections<Key extends string> = Record<Key, string[]>;

export type CompactFilterSegment<Key extends string> = {
  key: Key;
  label: string;
  index: string;
  options: string[];
};

export type ProductFilterSelections = CompactFilterSelections<ProductFilterKey>;
export type ProductFilterSegment = CompactFilterSegment<ProductFilterKey>;

type CompactProductFiltersProps<Key extends string> = {
  segments: CompactFilterSegment<Key>[];
  selections: CompactFilterSelections<Key>;
  openFilter: Key | null;
  onOpenFilterChange: (key: Key | null) => void;
  onToggle: (key: Key, value: string) => void;
  onClear: () => void;
  idPrefix?: string;
  ariaLabel?: string;
};

const selectionSummary = (values: string[]) => {
  if (values.length === 0) return 'All';
  if (values.length === 1) return values[0];
  return `${values.length} selected`;
};

export function CompactProductFilters<Key extends string = ProductFilterKey>({
  segments,
  selections,
  openFilter,
  onOpenFilterChange,
  onToggle,
  onClear,
  idPrefix = 'product-filter',
  ariaLabel = 'Product filters',
}: CompactProductFiltersProps<Key>) {
  const hasSelections = segments.some(({key}) => selections[key].length > 0);
  const activeFilter = openFilter ?? segments[0]?.key ?? null;

  return <div className="compact-filter-bar">
    <div className="compact-filter-module" data-visual-no-edit>
      <div
        className="compact-filter-segments"
        role="group"
        aria-label={ariaLabel}
        style={{gridTemplateColumns: `repeat(${Math.max(1, segments.length)}, minmax(0, 1fr))`}}
      >
        {segments.map(({key, label, index}) => {
          const isOpen = activeFilter === key;
          const selectedValues = selections[key];
          const summary = selectionSummary(selectedValues);
          return <button
            id={`${idPrefix}-${key}-trigger`}
            className={`${isOpen ? 'is-open' : ''} ${selectedValues.length > 0 ? 'has-value' : ''}`.trim()}
            type="button"
            aria-expanded={isOpen}
            aria-controls={`${idPrefix}-${key}-panel`}
            aria-label={`${label}: ${summary}`}
            onClick={() => onOpenFilterChange(key)}
            key={key}
          >
            <span className="compact-filter-segment__index">{index}</span>
            <span className="compact-filter-segment__copy"><b>{label}</b><small title={selectedValues.join(', ')}>{summary}</small></span>
            <ChevronDown aria-hidden="true"/>
          </button>;
        })}
      </div>

      {segments.map(({key, label, options}) => {
        if (activeFilter !== key) return null;
        const selectedValues = selections[key];
        const summary = selectionSummary(selectedValues);
        return <div
          id={`${idPrefix}-${key}-panel`}
          className="compact-filter-panel"
          role="region"
          aria-labelledby={`${idPrefix}-${key}-trigger`}
          key={key}
        >
          <header><span>{label} options · select one or more</span><strong>{summary}</strong></header>
          <div className="compact-filter-options" role="group" aria-label={`${label} options`}>
            {['All', ...options].map(value => {
              const isSelected = value === 'All' ? selectedValues.length === 0 : selectedValues.includes(value);
              return <button
                type="button"
                className={isSelected ? 'is-selected' : ''}
                aria-pressed={isSelected}
                onClick={() => onToggle(key, value)}
                key={value}
              >
                <span>{value}</span>{isSelected && <Check aria-hidden="true"/>}
              </button>;
            })}
          </div>
        </div>;
      })}
    </div>

    {hasSelections && <button className="compact-filter-clear" type="button" onClick={onClear}>Clear filters <X aria-hidden="true"/></button>}
  </div>;
}
