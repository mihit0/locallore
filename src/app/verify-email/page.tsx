'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // If user is already verified, redirect to profile
    if (user?.email_confirmed_at) {
      router.push('/profile')
    }
  }, [user, router])

  const handleResendEmail = async () => {
    if (!user?.email) return

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      })

      if (error) throw error

      setMessage('Verification email has been resent!')
    } catch (error) {
      console.error('Error resending verification email:', error)
      setMessage('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center mb-4">Please log in to verify your email</p>
            <Button asChild className="w-full">
              <Link href="/auth/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We've sent a verification email to <strong>{user.email}</strong>.
            Please check your inbox and click the verification link to complete your registration.
          </p>

          <p className="text-sm text-gray-500">
            Make sure to check your spam folder if you don't see the email in your inbox.
          </p>

          {message && (
            <p className={`text-sm ${message.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
              {message}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleResendEmail}
              disabled={isResending}
              variant="outline"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>

            <Button asChild variant="ghost">
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 