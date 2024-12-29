import React, { Suspense, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import { useAnalytics } from '@analytics/react'; // ^0.1.0

// Internal imports
import PublicLayout from '../../components/layout/PublicLayout/PublicLayout';
import Button from '../../components/common/Button/Button';
import MetricCard from '../../components/metrics/MetricCard/MetricCard';
import {
  Container,
  HeroSection,
  FeaturesSection,
  CTASection,
  MetricsGrid
} from './Home.styles';

// Featured metrics data structure
interface FeaturedMetric {
  id: string;
  name: string;
  category: string;
  description: string;
  benchmarkData: {
    p50_value: number;
    p75_value: number;
    p90_value: number;
    source: string;
    arr_range: string;
    effective_date: string;
  };
}

// Sample featured metrics for preview
const FEATURED_METRICS: FeaturedMetric[] = [
  {
    id: '1',
    name: 'Revenue Growth',
    category: 'Growth',
    description: 'Year-over-year revenue growth rate',
    benchmarkData: {
      p50_value: 0.8,
      p75_value: 1.2,
      p90_value: 1.5,
      source: 'Industry Survey 2023',
      arr_range: '$10M-$30M',
      effective_date: '2023-10-01'
    }
  },
  {
    id: '2',
    name: 'Net Dollar Retention',
    category: 'Revenue',
    description: 'Net revenue retention from existing customers',
    benchmarkData: {
      p50_value: 1.1,
      p75_value: 1.25,
      p90_value: 1.4,
      source: 'Industry Survey 2023',
      arr_range: '$10M-$30M',
      effective_date: '2023-10-01'
    }
  }
];

/**
 * Home page component for the SaaS Benchmarks Platform
 * Implements responsive design and accessibility standards from technical specifications
 */
const Home: React.FC = () => {
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle navigation to benchmarks page with analytics tracking
   */
  const handleViewBenchmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      analytics.track('cta_click', {
        location: 'home_page',
        action: 'view_benchmarks'
      });
      await navigate('/benchmarks');
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, analytics]);

  // Track page view
  React.useEffect(() => {
    analytics.page('home_page');
  }, [analytics]);

  return (
    <PublicLayout>
      <Container>
        <HeroSection>
          <h1 className="text-4xl font-bold mb-6">
            SaaS Performance Benchmarks
          </h1>
          <p className="text-xl mb-8">
            Access comprehensive benchmark data across 14 key performance indicators
            for SaaS companies. Make data-driven decisions with confidence.
          </p>
          <Button
            variant="primary"
            size="large"
            onClick={handleViewBenchmarks}
            disabled={isLoading}
            aria-label="View SaaS benchmarks data"
          >
            View Benchmarks
          </Button>
        </HeroSection>

        <FeaturesSection>
          <h2 className="text-2xl font-semibold mb-8">
            Featured Metrics
          </h2>
          <Suspense fallback={<div>Loading metrics...</div>}>
            <MetricsGrid>
              {FEATURED_METRICS.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  benchmarkData={metric.benchmarkData}
                  className="metric-card"
                />
              ))}
            </MetricsGrid>
          </Suspense>
        </FeaturesSection>

        <CTASection>
          <h2 className="text-3xl font-bold mb-6">
            Ready to Benchmark Your Performance?
          </h2>
          <p className="text-xl mb-8">
            Access detailed benchmarks filtered by revenue range and data source.
          </p>
          <Button
            variant="secondary"
            size="large"
            onClick={handleViewBenchmarks}
            disabled={isLoading}
            aria-label="Access detailed SaaS benchmarks"
          >
            Access Benchmarks
          </Button>
        </CTASection>
      </Container>
    </PublicLayout>
  );
};

// Export with display name for debugging
Home.displayName = 'Home';

export default Home;