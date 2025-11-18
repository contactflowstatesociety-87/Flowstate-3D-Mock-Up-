
import React, { useState } from 'react';
import * as authService from '../services/authService';
import type { User } from '../types';

interface RegisterPageProps {
  onRegisterSuccess: (user: User) => void;
  onNavigate: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const user = await authService.register(email, password);
      onRegisterSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Failed to register.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-dark">
      <div className="w-full max-w-md p-8 space-y-8 bg-surface-light rounded-lg shadow-lg border border-surface-lighter">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text">
            Create a new account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="p-3 bg-brand-red/20 text-red-300 border border-brand-red rounded-md">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input id="email-address" name="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-surface-lighter bg-surface-light text-text placeholder-text-subtle focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm rounded-t-md"
                placeholder="Email address" />
            </div>
            <div>
              <input id="password" name="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-surface-lighter bg-surface-light text-text placeholder-text-subtle focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password" />
            </div>
            <div>
              <input id="confirm-password" name="confirm-password" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-surface-lighter bg-surface-light text-text placeholder-text-subtle focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm rounded-b-md"
                placeholder="Confirm Password" />
            </div>
          </div>
          <div>
            <button type="submit" disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50">
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
          <div className="text-sm text-center">
            <button onClick={onNavigate} type="button" className="font-medium text-primary-light hover:text-primary">
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;