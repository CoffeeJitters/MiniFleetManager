import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole } from '@/lib/middleware'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ message: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' }, { status: 500 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    await requireRole(['OWNER'])

    const { priceId } = await request.json()

    if (!priceId) {
      return NextResponse.json({ message: 'Price ID is required' }, { status: 400 })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const checkoutSession = await createCheckoutSession(
      session.user.companyId,
      priceId,
      `${baseUrl}/billing?success=true`,
      `${baseUrl}/billing?canceled=true`
    )

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ message: error.message || 'Internal server error' }, { status: 500 })
  }
}


