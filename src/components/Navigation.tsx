"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Compass, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  const links = [
    {
      href: '/map',
      label: 'Map',
      icon: MapPin
    },
    {
      href: '/discovery',
      label: 'Discover',
      icon: Compass
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: User
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-[#000000] to-[#000000]/90 border-t border-white/10 py-2 px-4 md:px-6 backdrop-blur-sm">
      <div className="container mx-auto">
        <div className="flex justify-around items-center">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 text-sm transition-colors rounded-lg',
                pathname === href
                  ? 'text-[#B1810B] bg-white/10'
                  : 'text-white/70 hover:text-[#B1810B] hover:bg-white/5'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
} 