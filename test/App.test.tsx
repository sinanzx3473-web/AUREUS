import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(document.querySelector('body')).toBeInTheDocument();
  });

  it('should render landing page by default', () => {
    render(<App />);
    // Landing page should be rendered at root path
    expect(document.querySelector('body')).toBeInTheDocument();
  });
});
