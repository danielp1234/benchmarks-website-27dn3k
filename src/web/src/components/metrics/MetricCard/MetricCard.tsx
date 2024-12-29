import React, { memo } from 'react'; // ^18.0.0
import {
  CardContainer,
  MetricTitle,
  MetricValue,
  PercentileContainer,
  PercentileItem,
  PercentileLabel,
  PercentileValue,
  MetricSource,
  MetricMetadata,
  MetadataLabel,
  MetadataValue
} from './MetricCard.styles';

/**
 * Interface for metric data structure
 */
interface Metric {
  id: string;
  name: string;
  category: string;
  description: string;
}

/**
 * Interface for benchmark data structure
 */
interface BenchmarkData {
  p5_value: number;
  p25_value: number;
  p50_value: number;
  p75_value: number;
  p90_value: number;
  source: string;
  arr_range: string;
  effective_date: string;
}

/**
 * Props interface for MetricCard component
 */
interface MetricCardProps {
  /** Metric information */
  metric: Metric;
  /** Benchmark data for the metric */
  benchmarkData: BenchmarkData;
  /** Optional CSS class name */
  className?: string;
  /** Optional error handler */
  onError?: (error: Error) => void;
}

/**
 * Formats a decimal number as a percentage string
 * @param value - Number to format
 * @returns Formatted percentage string
 */
const formatPercentage = (value: number): string => {
  if (value == null) return 'N/A';
  try {
    return `${(value * 100).toFixed(1)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return 'N/A';
  }
};

/**
 * Formats a date string to locale format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * MetricCard component displays SaaS metric information with percentile distribution
 * in an accessible, responsive card format following Material Design principles.
 */
export const MetricCard: React.FC<MetricCardProps> = memo(({
  metric,
  benchmarkData,
  className,
  onError
}) => {
  // Percentile data structure for consistent rendering
  const percentiles = [
    { label: 'P5', value: benchmarkData.p5_value },
    { label: 'P25', value: benchmarkData.p25_value },
    { label: 'P50', value: benchmarkData.p50_value },
    { label: 'P75', value: benchmarkData.p75_value },
    { label: 'P90', value: benchmarkData.p90_value }
  ];

  return (
    <CardContainer
      className={className}
      role="article"
      aria-label={`${metric.name} benchmark data`}
    >
      <MetricTitle
        role="heading"
        aria-level={3}
        title={metric.description}
      >
        {metric.name}
      </MetricTitle>

      <PercentileContainer
        role="group"
        aria-label="Percentile distribution"
      >
        {percentiles.map(({ label, value }) => (
          <PercentileItem
            key={label}
            role="text"
            aria-label={`${label} percentile`}
          >
            <PercentileLabel>{label}</PercentileLabel>
            <PercentileValue>{formatPercentage(value)}</PercentileValue>
          </PercentileItem>
        ))}
      </PercentileContainer>

      <MetricMetadata>
        <div>
          <MetadataLabel>Category: </MetadataLabel>
          <MetadataValue>{metric.category}</MetadataValue>
        </div>
        <div>
          <MetadataLabel>ARR Range: </MetadataLabel>
          <MetadataValue>{benchmarkData.arr_range}</MetadataValue>
        </div>
      </MetricMetadata>

      <MetricSource>
        Source: {benchmarkData.source} • 
        Updated: {formatDate(benchmarkData.effective_date)}
      </MetricSource>
    </CardContainer>
  );
});

// Display name for debugging
MetricCard.displayName = 'MetricCard';

export default MetricCard;