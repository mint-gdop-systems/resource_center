import React from 'react';
import { render, screen } from '@testing-library/react';
import GDOPMenu from './GDOPMenu';

// Mock the dropdown menu components
jest.mock('../ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-group">{children}</div>,
}));

describe('GDOPMenu', () => {
  it('renders the GDOP menu trigger button', () => {
    render(<GDOPMenu />);
    
    const triggerButton = screen.getByRole('button', { name: /gdop applications menu/i });
    expect(triggerButton).toBeInTheDocument();
  });

  it('contains all expected menu items', () => {
    render(<GDOPMenu />);
    
    expect(screen.getByText('Visitor Management')).toBeInTheDocument();
    expect(screen.getByText('Letter Management')).toBeInTheDocument();
    expect(screen.getByText('Transport Management')).toBeInTheDocument();
    expect(screen.getByText('Contact Center')).toBeInTheDocument();
    expect(screen.getByText('Resource Center')).toBeInTheDocument();
  });
});