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
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-black border border-white/20">
          <CardContent className="p-6">
            <p className="text-center mb-4 text-white">Please log in to verify your email</p>
            <Button asChild className="w-full bg-[#B1810B] text-white hover:bg-[#8B6B09]">
              <Link href="/auth/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4 flex items-center justify-center">
      <Card className="w-full max-w-md bg-black border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-center">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300">
            We've sent a verification email to <strong className="text-white">{user.email}</strong>.
            Please check your inbox and click the verification link to complete your registration.
          </p>

          <p className="text-sm text-gray-400">
            Make sure to check your spam folder if you don't see the email in your inbox.
          </p>

          {message && (
            <p className={`text-sm ${message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
              {message}
            </p>
          )}

          <div className="w-full h-px bg-white/20"></div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleResendEmail}
              disabled={isResending}
              variant="ghost"
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>

            <Button asChild variant="ghost" className="text-gray-300 hover:bg-gray-800 hover:text-white">
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 