import { GoogleButton } from '@/components/auth/google-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Firewise</CardTitle>
          <CardDescription>
            Track expenses, share ledgers, and manage your finances together
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleButton />
        </CardContent>
      </Card>
    </div>
  );
}
