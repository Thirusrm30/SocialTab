import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

function getErrorMessage(err: any): string {
  if (err.message && err.message.includes('Only @gmail.com emails')) {
    return err.message;
  }
  switch (err.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completion.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return err.message || 'An unexpected error occurred. Please try again.';
  }
}

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await register(email, password, displayName);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #2E8B8B, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #1F3A5F, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #F4B860, transparent 70%)' }}
      />

      <div className="w-full max-w-md animate-fade-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-card mb-4"
            style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2E8B8B 100%)' }}
          >
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: '#1F3A5F' }}
          >
            SocialTab
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6B7F99' }}>
            The friendly way to split expenses with your people
          </p>
        </div>

        {/* Card */}
        <Card className="border border-[#E3EAF4] shadow-card rounded-2xl bg-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle
              className="text-xl text-center font-semibold"
              style={{ color: '#1F3A5F' }}
            >
              Welcome back
            </CardTitle>
            <CardDescription className="text-center text-sm" style={{ color: '#6B7F99' }}>
              Sign in or create a new account below
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert
                variant="destructive"
                className="mb-4 rounded-xl border-red-200 bg-red-50 text-red-700"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList
                className="grid w-full grid-cols-2 mb-5 rounded-xl p-1"
                style={{ background: '#F0F4FB' }}
              >
                <TabsTrigger
                  value="login"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] transition-all"
                >
                  Sign in
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#1F3A5F] data-[state=active]:shadow-soft text-[#6B7F99] transition-all"
                >
                  Create account
                </TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-medium text-[#2B2B2B]">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9DAEC5]" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B] focus:ring-[#2E8B8B]/20 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm font-medium text-[#2B2B2B]">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9DAEC5]" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B] focus:ring-[#2E8B8B]/20 h-11"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    id="btn-login"
                    type="submit"
                    className="w-full h-11 rounded-xl font-semibold text-white shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:translate-y-0 mt-2"
                    style={{ background: 'linear-gradient(135deg, #1F3A5F 0%, #2a4e7f 100%)' }}
                    disabled={loading}
                  >
                    {loading ? 'Signing in…' : (
                      <span className="flex items-center gap-2">
                        Sign in <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* REGISTER */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="register-name" className="text-sm font-medium text-[#2B2B2B]">
                      Your name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9DAEC5]" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="John Doe"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-10 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B] focus:ring-[#2E8B8B]/20 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-email" className="text-sm font-medium text-[#2B2B2B]">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9DAEC5]" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B] focus:ring-[#2E8B8B]/20 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-password" className="text-sm font-medium text-[#2B2B2B]">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9DAEC5]" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 rounded-xl border-[#D3DFEE] focus:border-[#2E8B8B] focus:ring-[#2E8B8B]/20 h-11"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    id="btn-register"
                    type="submit"
                    className="w-full h-11 rounded-xl font-semibold text-white shadow-soft transition-all hover:shadow-hover hover:-translate-y-0.5 active:translate-y-0 mt-2"
                    style={{ background: 'linear-gradient(135deg, #2E8B8B 0%, #3aacac 100%)' }}
                    disabled={loading}
                  >
                    {loading ? 'Creating account…' : (
                      <span className="flex items-center gap-2">
                        Create account <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E3EAF4]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#9DAEC5] font-medium">or continue with</span>
              </div>
            </div>

            {/* Google */}
            <Button
              id="btn-google"
              variant="outline"
              className="w-full h-11 rounded-xl border-[#D3DFEE] text-[#2B2B2B] font-medium hover:bg-[#F7F9FB] hover:border-[#2E8B8B]/40 transition-all"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2.5 h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <p className="text-center text-xs text-[#9DAEC5] mt-4">
              By continuing, you agree to our{' '}
              <span className="text-[#2E8B8B] font-medium cursor-pointer hover:underline">Terms</span>{' '}
              and{' '}
              <span className="text-[#2E8B8B] font-medium cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
