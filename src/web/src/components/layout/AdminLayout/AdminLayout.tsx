import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  AdminLayoutContainer,
  AdminHeader,
  AdminSidebar,
  MainContent
} from './AdminLayout.styles';
import { useAuth } from '../../../hooks/useAuth';
import Loading from '../../common/Loading/Loading';
import { UserRole } from '../../../interfaces/auth.interface';

/**
 * Props interface for AdminLayout component
 */
interface AdminLayoutProps {
  children?: React.ReactNode;
}

/**
 * AdminLayout component that implements the admin interface layout with responsive design
 * and authentication protection. Provides the base layout structure for all admin pages.
 *
 * @component
 * @implements {React.FC<AdminLayoutProps>}
 */
const AdminLayout: React.FC<AdminLayoutProps> = () => {
  // Authentication state management
  const { isAuthenticated, isLoading, user, checkPermission } = useAuth();
  const location = useLocation();
  
  // Mobile menu state management
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  
  // Effect to handle mobile menu close on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle mobile menu toggle
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('open');
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Loading size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has admin access
  if (!checkPermission(UserRole.ADMIN)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminLayoutContainer>
      <AdminHeader>
        {/* Mobile menu toggle button */}
        <button
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-sidebar"
          aria-label="Toggle navigation menu"
        >
          <span className="menu-icon"></span>
        </button>

        {/* Admin header content */}
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span>{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
      </AdminHeader>

      <AdminSidebar
        id="admin-sidebar"
        className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}
        role="navigation"
        aria-label="Admin navigation"
      >
        {/* Sidebar content will be injected by navigation component */}
      </AdminSidebar>

      <MainContent
        role="main"
        aria-label="Admin content"
      >
        {/* Render child routes */}
        <Outlet />
      </MainContent>
    </AdminLayoutContainer>
  );
};

// Add display name for debugging
AdminLayout.displayName = 'AdminLayout';

export default AdminLayout;