import styled from 'styled-components';

// Main container for the metrics page with responsive layout
export const Container = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px;
  
  @media (max-width: 1024px) {
    padding: 24px;
  }
  
  @media (max-width: 768px) {
    padding: 16px;
  }
  
  @media (max-width: 320px) {
    padding: 12px;
  }
`;

// Header section with title and primary actions
export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  
  h1 {
    font-size: 28px;
    font-weight: 600;
    color: #1a73e8;
    margin: 0;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    
    h1 {
      font-size: 24px;
    }
  }
`;

// Action bar containing filters and action buttons
export const ActionBar = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 12px;
  }
  
  @media (max-width: 320px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

// Container for the metrics data table with Material elevation
export const TableContainer = styled.div`
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 
              0 4px 8px rgba(0, 0, 0, 0.05);
  overflow: auto;
  margin-bottom: 32px;
  
  // Custom scrollbar styling
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
    
    &:hover {
      background: #a1a1a1;
    }
  }
  
  // Table responsive handling
  @media (max-width: 768px) {
    margin: 0 -16px;
    border-radius: 0;
  }
`;

// Search input container with Material Design styling
export const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 400px;
  
  input {
    width: 100%;
    padding: 12px 16px;
    padding-left: 40px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 14px;
    line-height: 20px;
    transition: border-color 0.2s ease;
    
    &:focus {
      outline: none;
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.1);
    }
  }
  
  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #5f6368;
  }
  
  @media (max-width: 320px) {
    max-width: 100%;
  }
`;

// Pagination container with responsive layout
export const PaginationContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  
  @media (max-width: 768px) {
    justify-content: center;
    padding: 12px;
  }
`;

// Empty state container with centered content
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #5f6368;
  
  svg {
    font-size: 48px;
    margin-bottom: 16px;
    color: #dadce0;
  }
  
  h3 {
    font-size: 16px;
    font-weight: 500;
    margin: 0 0 8px;
  }
  
  p {
    font-size: 14px;
    margin: 0;
  }
`;

// Loading state overlay with Material Design progress indicator
export const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  
  .progress-circular {
    color: #1a73e8;
  }
`;