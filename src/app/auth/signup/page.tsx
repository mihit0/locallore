'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [graduationYear, setGraduationYear] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const currentYear = new Date().getFullYear()
  const graduationYears = Array.from({ length: 11 }, (_, i) => currentYear + i)

  const validatePurdueEmail = (email: string) => {
    return email.endsWith('@purdue.edu')
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!validatePurdueEmail(email)) {
      setError('Please use a valid @purdue.edu email address')
      setLoading(false)
      return
    }

    try {
      // First, create the auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          }
        }
      })

      if (authError) throw authError

      if (!authUser?.id) {
        throw new Error('Failed to create user account')
      }

      // Then create the user profile
      const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')
      console.log('Creating user profile with:', {
        id: authUser.id,
        username,
        displayName,
        email
      })

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          username: username,
          display_name: displayName,
          purdue_email: email,
          graduation_year: graduationYear ? parseInt(graduationYear) : null,
          is_verified: false
        })

      if (profileError) {
        console.error('Profile creation error:', {
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code
        })
        throw new Error('Failed to create user profile. Please try again or contact support.')
      }

      // Verify the user was created
      const { data: verifyData, error: verifyError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (verifyError) {
        console.error('Verification error:', {
          message: verifyError.message,
          details: verifyError.details,
          hint: verifyError.hint,
          code: verifyError.code
        })
      } else {
        console.log('User profile created and verified:', verifyData)
      }

      router.push('/verify-email')
    } catch (error) {
      console.error('Signup error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Card className="w-full max-w-md bg-black border border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-center">Sign Up for LocalLore</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={3}
                className="bg-gray-900 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>

            <div>
              <Input
                type="email"
                placeholder="Purdue Email (@purdue.edu)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                pattern="[^@]+@purdue\.edu"
                title="Please use your Purdue email address"
                className="bg-gray-900 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            
            <div>
              <Select value={graduationYear} onValueChange={setGraduationYear}>
                <SelectTrigger className="bg-gray-900 border-white/20 text-white">
                  <SelectValue placeholder="Expected Graduation Year (Optional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20 text-white">
                  {graduationYears.map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-white hover:bg-gray-800">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                type="password"
                placeholder="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-gray-900 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#B1810B] text-white hover:bg-[#8B6B09] disabled:bg-gray-700 disabled:text-gray-400" 
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </form>

          <div className="w-full h-px bg-white/20 my-6"></div>

          <div className="text-center space-y-3">
            <p className="text-sm text-gray-300">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#B1810B] hover:text-[#D4940D] transition-colors">
                Login
              </Link>
            </p>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-300 transition-colors block">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}