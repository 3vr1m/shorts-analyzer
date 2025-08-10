"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useButtonProtection } from "@/contexts/ProtectionContext";

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const { isUnlocked } = useButtonProtection();
  
  // Allow access to current page and monitoring page
  const isPublicPage = href === pathname || href === '/monitoring' || href === '/resources';
  
  const handleClick = (e: React.MouseEvent) => {
    if (!isUnlocked && !isPublicPage) {
      e.preventDefault();
      const hints = [
        "🌟 Share your daily motivation first!",
        "💡 Set your intention for today above!",
        "✨ What's driving you today?",
        "🎯 Tell us your purpose for today!"
      ];
      const randomHint = hints[Math.floor(Math.random() * hints.length)];
      alert(randomHint);
    }
  };
  
  return (
    <Link 
      href={href}
      onClick={handleClick}
      className={`relative py-2 px-1 text-sm font-medium transition-colors duration-200 ${
        isActive 
          ? 'text-foreground' 
          : 'text-muted hover:text-foreground'
      } ${!isUnlocked && !isPublicPage ? 'opacity-75' : ''}`}
    >
      {label}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
      )}
    </Link>
  );
}
