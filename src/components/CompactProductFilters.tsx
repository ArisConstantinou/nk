import {Check, ChevronDown, X} from 'lucide-react';

export type ProductFilterKey = 'category' | 'space' | 'season';

export type ProductFilterSelections = Record<ProductFilterKey, string[]>;

export type ProductFilterSegment = {
  key: ProductFilterKey;
  label: string;
  index: string;
  options: string[];
};

type CompactProductFiltersProps = {
  segments: ProductFilterSegment[];
  selections: ProductFilterSelections;
  openFilter: ProductFilterKey | null;
  onOpenFilterChange: (key: ProductFilterKey | null) => void;
  onToggle: (key: ProductFilterKey, value: string) => void;
  onClear: () => void;
  idPrefix?: string;
};

const selectionSummary = (values: string[]) => {
  if (values.length === 0) return 'All';
  if (values.length === 1) return values[0];
  return `${values.length} selected`;
};

export function CompactProductFilters({
  segments,
  selections,
  openFilter,
  onOpenFilterChange,
  onToggle,
  onClear,
  idPrefix = 'product-filter',
}: CompactProductFiltersProps) {
  const hasSelections = segments.some(({key}) => selections[key].length > 0);
  const activeFilter = openFilter ?? segments[0]?.key ?? null;

  return <div className="compact-filter-bar">
    <div className="compact-filter-module" data-visual-no-edit>
      <div className="compact-filter-segments" role="group" aria-label="Product filters">
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
