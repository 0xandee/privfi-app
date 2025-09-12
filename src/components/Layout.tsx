import { Outlet, NavLink } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

const Layout = () => {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Top Header with Logo */}
      <div className="p-8 absolute top-0 left-0">
        <img src="/PrivFi.svg" alt="PrivFi" className="h-6 w-auto" />
      </div>

      {/* Navigation Links */}
      <div className="p-8 absolute top-0 right-0 z-10">
        <nav className="flex items-center gap-4">
          <NavLink to="/">
            {({ isActive }) => (
              <Button
                variant="link"
                className={`text-sm font-medium transition-colors hover:text-white ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}
              >
                Swap
              </Button>
            )}
          </NavLink>
          <NavLink to="/how-it-works">
            {({ isActive }) => (
              <Button
                variant="link"
                className={`text-sm font-medium transition-colors hover:text-white ${
                  isActive ? 'text-white' : 'text-gray-400'
                }`}
              >
                How it works
              </Button>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Main Content */}
      <Outlet />
    </div>
  );
};

export default Layout;