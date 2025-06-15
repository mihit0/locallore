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
    <nav className="fixed bottom-0 left-0 right-0 bg-black py-2 px-4 md:px-6">
      <div className="container mx-auto">
        <div className="flex justify-around items-center">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 text-xs transition-colors',
                pathname === href
                  ? 'text-white'
                  : 'text-white/60 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-normal">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
} 