// components/Sidebar.tsx

import Link from 'next/link';
import { HomeIcon, PhotoIcon, ComputerDesktopIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 shadow-md fixed top-0 left-0">

      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-center text-gray-800 transition-transform duration-300 hover:scale-105 cursor-pointer">
          Screen Shift
        </h1>
      </div>

      <nav className="flex flex-col py-4 px-4">
        <ul>
          <li>
            <Link href="/" className="flex items-center py-3 px-6 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-100">
              <HomeIcon className="h-5 w-5 text-gray-700 mr-2" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/pictures" className="flex items-center py-3 px-6 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-100">
              <PhotoIcon className="h-5 w-5 text-gray-700 mr-2" />
              Pictures
            </Link>
          </li>
          <li>
            <Link href="/screens" className="flex items-center py-3 px-6 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-100">
              <ComputerDesktopIcon className="h-5 w-5 text-gray-700 mr-2" />
              Screens
            </Link>
          </li>
          <li>
            <Link href="/configuration" className="flex items-center py-3 px-6 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-100">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-700 mr-2" />
              Configuration
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
