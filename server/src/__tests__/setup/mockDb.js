import { vi } from 'vitest';

export const mockConnection = {
  beginTransaction: vi.fn(),
  query: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

export const mockPool = {
  query: vi.fn(),
  getConnection: vi.fn(),
};

export function resetMockDb() {
  mockPool.query.mockReset();
  mockPool.getConnection.mockReset();
  mockConnection.beginTransaction.mockReset();
  mockConnection.query.mockReset();
  mockConnection.commit.mockReset();
  mockConnection.rollback.mockReset();
  mockConnection.release.mockReset();
  mockPool.getConnection.mockResolvedValue(mockConnection);
}

export function queuePoolQueries(...results) {
  results.forEach((result) => {
    mockPool.query.mockResolvedValueOnce(result);
  });
}

export function queueConnectionQueries(...results) {
  results.forEach((result) => {
    mockConnection.query.mockResolvedValueOnce(result);
  });
}

resetMockDb();
