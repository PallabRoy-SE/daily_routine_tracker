import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskBoard from './TaskBoard';
import * as api from '../services/api';

// Mock the API service
vi.mock('../services/api', () => ({
  fetchTasks: vi.fn(),
  completeTask: vi.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('TaskBoard', () => {
  it('renders links with correct HTML attributes based on action type', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Task with Links',
        priority: 2,
        is_completed: false,
        links: [
          { url: 'https://google.com', label: 'Search', action: 'new_tab' },
          { url: '/file.pdf', label: 'Download PDF', action: 'download' },
        ],
      },
    ];

    vi.mocked(api.fetchTasks).mockResolvedValue(mockTasks);

    render(<TaskBoard />, { wrapper });

    // Check "new_tab" link
    const searchLink = await screen.findByText('Search');
    expect(searchLink).toHaveAttribute('target', '_blank');
    expect(searchLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Check "download" link
    const downloadLink = await screen.findByText('Download PDF');
    expect(downloadLink).toHaveAttribute('download', 'true');
    expect(downloadLink).not.toHaveAttribute('target');
  });
});
