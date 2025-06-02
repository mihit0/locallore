'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const validatePurdueEmail = (email: string) => {
    return email.endsWith('@purdue.edu')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!validatePurdueEmail(email)) {
      setError('Please use your @purdue.edu email address')
      setLoading(false)
      return
    }

    try {
      console.log('Attempting login for:', email)

      // First, sign in the user
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('Sign in error:', signInError)
        throw signInError
      }

      if (!authData.user) {
        throw new Error('No user data returned after login')
      }

      console.log('Login successful:', {
        userId: authData.user.id,
        email: authData.user.email,
        emailConfirmed: authData.user.email_confirmed_at
      })

      // Verify the user exists in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (userError) {
        console.error('Error fetching user profile:', userError)
        throw new Error('Could not verify user profile')
      }

      if (!userData) {
        console.error('No user profile found')
        throw new Error('User profile not found')
      }

      console.log('User profile found:', userData)

      // Check if email is verified
      if (!authData.user.email_confirmed_at) {
        router.push('/verify-email')
      } else {
        router.push('/profile')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#B1810B] to-black">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to LocalLore</CardTitle>
          <CardDescription>
            Access your Purdue events dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Purdue Email (@purdue.edu)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                pattern="[^@]+@purdue\.edu"
                title="Please use your Purdue email address"
              />
            </div>
            
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                Sign up with @purdue.edu
              </Link>
            </p>
            <Link href="/" className="text-sm text-gray-500 hover:underline">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}