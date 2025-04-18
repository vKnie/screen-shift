import Link from 'next/link';
import { HomeIcon, PhotoIcon, AdjustmentsHorizontalIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  onLanguageChange: (language: string) => void;
}

export default function Sidebar({ onLanguageChange }: SidebarProps) {
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
            <Link href="/configuration" className="flex items-center py-3 px-6 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-100">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-700 mr-2" />
              Configuration
            </Link>
          </li>
          <li>
            <Link href="/convert" className="flex items-center py-3 px-6 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-100">
              <ArrowsRightLeftIcon className="h-5 w-5 text-gray-700 mr-2" />
              Convert to
            </Link>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Language</h2>
        <select
          onChange={(e) => onLanguageChange(e.target.value)}
          className="p-2 border border-gray-300 rounded-md"
        >
          <option value="fr">🇫🇷 Français</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </div>
    </div>
  );
}
