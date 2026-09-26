import type { FormEvent } from 'react'
import type { AuthForm, AuthMode, UserSession } from '../types'

type AuthPanelProps = {
  authMode: AuthMode
  authForm: AuthForm
  user: UserSession | null
  authError: string
  authMessage: string
  onModeChange: (mode: AuthMode) => void
  onFieldChange: (field: keyof AuthForm, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onLogout: () => void
}

export function AuthPanel({
  authMode,
  authForm,
  user,
  authError,
  authMessage,
  onModeChange,
  onFieldChange,
  onSubmit,
  onLogout,
}: AuthPanelProps) {
  if (user) {
    return (
      <div className="auth-panel">
        <div className="account-banner">
          <div>
            <p className="eyebrow small">Account</p>
            <h3>{user.email}</h3>
          </div>
          <span className="role-badge">{user.role}</span>
          <button type="button" className="nav-link-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-panel">
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-header">
          <div>
            <p className="eyebrow small">Your account</p>
            <h3>{authMode === 'login' ? 'Welcome back' : 'Create account'}</h3>
          </div>
          <div className="auth-toggle">
            <button
              type="button"
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => onModeChange('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => onModeChange('register')}
            >
              Register
            </button>
          </div>
        </div>

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={authForm.email}
            onChange={(event) => onFieldChange('email', event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={authForm.password}
            onChange={(event) => onFieldChange('password', event.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />
        </label>

        {authMode === 'register' && (
          <label className="auth-field">
            <span>Role</span>
            <select value={authForm.role} onChange={(event) => onFieldChange('role', event.target.value)}>
              <option value="CUSTOMER">Customer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
        )}

        {authError && <p className="auth-feedback error">{authError}</p>}
        {authMessage && <p className="auth-feedback success">{authMessage}</p>}

        <button type="submit" className="auth-submit">
          {authMode === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
