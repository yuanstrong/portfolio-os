import { FormEvent, MouseEvent, useEffect, useState } from 'react';
import { KeyRound, LockKeyhole, ScanLine, Shield, X } from 'lucide-react';
import { loginWithCredential, verifyTwoFactor } from '../api/auth';

type AuthStep = 'credentials' | 'twoFactor';

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (token: string) => void;
};

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setStep('credentials');
      setPassword('');
      setCode('');
      setChallengeId(null);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const submitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const outcome = await loginWithCredential(username.trim(), password);
      if (outcome.status === 'authenticated') {
        onAuthenticated(outcome.token);
        onClose();
        return;
      }

      setChallengeId(outcome.challengeId);
      setStep('twoFactor');
      setPassword('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitTwoFactor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challengeId) {
      setError('Authentication request failed');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const outcome = await verifyTwoFactor(challengeId, code);
      if (outcome.status === 'authenticated') {
        onAuthenticated(outcome.token);
        onClose();
        return;
      }
      setError('Authentication request failed');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const stopPanelClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-outline-variant bg-surface-container-lowest shadow-[0_0_40px_rgba(0,0,0,0.6)]"
        onClick={stopPanelClick}
      >
        <div className="flex items-center justify-between border-b border-[#222222] px-5 py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 id="auth-modal-title" className="text-[13px] font-bold uppercase text-on-surface">
                {step === 'credentials' ? 'Credential Authentication' : '2FA Authentication'}
              </h2>
              <p className="text-[11px] uppercase text-zinc-600">
                {step === 'credentials' ? 'RSA_OAEP encrypted login' : 'Encrypted one-time code'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close authentication modal"
            className="flex h-8 w-8 items-center justify-center border border-[#222222] text-zinc-500 transition-colors hover:border-emerald-500 hover:text-emerald-400"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'credentials' ? (
          <form className="flex flex-col gap-5 p-5" onSubmit={submitCredentials}>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
                <KeyRound className="h-3.5 w-3.5" />
                Username
              </span>
              <input
                className="border-b border-[#333333] bg-transparent px-0 py-2 text-[13px] text-on-surface outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-500"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="operator"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
                <LockKeyhole className="h-3.5 w-3.5" />
                Password
              </span>
              <input
                className="border-b border-[#333333] bg-transparent px-0 py-2 text-[13px] text-on-surface outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-500"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="encrypted before relay"
                required
              />
            </label>

            <AuthError message={error} />

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 border border-[#333333] bg-[#0a0a0a] px-5 py-2 text-[12px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              {submitting ? 'AUTHENTICATING' : 'AUTHENTICATE'}
            </button>
          </form>
        ) : (
          <form className="flex flex-col gap-5 p-5" onSubmit={submitTwoFactor}>
            <label className="flex flex-col gap-2">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
                <ScanLine className="h-3.5 w-3.5" />
                6 Digit Code
              </span>
              <input
                className="border-b border-[#333333] bg-transparent px-0 py-2 text-[18px] text-on-surface outline-none transition-colors placeholder:text-zinc-700 focus:border-emerald-500"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
              />
            </label>

            <AuthError message={error} />

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="flex items-center justify-center gap-2 border border-[#333333] bg-[#0a0a0a] px-5 py-2 text-[12px] uppercase tracking-wider text-zinc-300 transition-colors hover:border-emerald-500 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ScanLine className="h-4 w-4" />
              {submitting ? 'VERIFYING' : 'VERIFY_CODE'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function AuthError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="border border-error-container bg-error-container/10 px-3 py-2 text-[12px] text-error">
      {message}
    </div>
  );
}
