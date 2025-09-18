import { Outlet, NavLink } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import PixelBlast from '@/shared/components/PixelBlast';

const Layout = () => {
  return (
    <div className="min-h-screen bg-transparent flex flex-col relative">
      {/* PixelBlast Background */}
      <div className="absolute inset-0 z-0">
        <PixelBlast
          variant="square"
          pixelSize={5}
          color="#3c3c3c"
          patternScale={1}
          patternDensity={1}
          pixelSizeJitter={10}
          speed={1}
          edgeFade={0.3}
          enableRipples={false}
          liquid={false}
        />
      </div>

      {/* Top Header with Logo */}
      <div className="p-8 absolute top-0 left-0 z-20">
        <img src="/PrivFi.svg" alt="PrivFi" className="h-6 w-auto" />
      </div>

      {/* Navigation Links */}
      <div className="p-8 absolute top-0 right-0 z-20">
        <nav className="flex items-center gap-4">
          <NavLink to="/">
            {({ isActive }) => (
              <Button
                variant="link"
                className={`text-sm font-medium transition-colors hover:text-white ${isActive ? 'text-white' : 'text-gray-400'
                  }`}
              >
                Swap
              </Button>
            )}
          </NavLink>
          <NavLink to="/privacy">
            {({ isActive }) => (
              <Button
                variant="link"
                className={`text-sm font-medium transition-colors hover:text-white ${isActive ? 'text-white' : 'text-gray-400'
                  }`}
              >
                Privacy
              </Button>
            )}
          </NavLink>
          <NavLink to="/how-it-works">
            {({ isActive }) => (
              <Button
                variant="link"
                className={`text-sm font-medium transition-colors hover:text-white ${isActive ? 'text-white' : 'text-gray-400'
                  }`}
              >
                How it works
              </Button>
            )}
          </NavLink>
          <NavLink to="/roadmap">
            {({ isActive }) => (
              <Button
                variant="link"
                className={`text-sm font-medium transition-colors hover:text-white ${isActive ? 'text-white' : 'text-gray-400'
                  }`}
              >
                Roadmap
              </Button>
            )}
          </NavLink>
        </nav>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;