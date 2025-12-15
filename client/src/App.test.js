import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: function create() {
      return this;
    }
  }
}));

import LoginPage from './pages/LoginPage';

test('renders login page', () => {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
  expect(screen.getByText('Connexion')).toBeInTheDocument();
});
