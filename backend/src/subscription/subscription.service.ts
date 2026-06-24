import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

@Injectable()
export class SubscriptionService {
    constructor(private prisma: PrismaService) { }

    private async getCustomerIdFromDb(userId: string): Promise<string | null> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true },
        });
        return user?.stripeCustomerId || null;
    }

    async createCheckoutSession(userId: string, userEmail: string, businessId: string, priceId: string) {
        const customerId = await this.getCustomerIdFromDb(userId);

        const session = await stripe.checkout.sessions.create({
            ...(customerId ? { customer: customerId } : { customer_email: userEmail }),
            payment_method_types: ['card'],
            line_items: [{
                // AJUSTE: Usamos el priceId recibido como argumento
                price: priceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/subscription/pricing`,
            client_reference_id: businessId,
            // Opcional: Esto ayuda a Stripe a asociar la metadata de tu negocio
            metadata: {
                businessId: businessId,
                userId: userId
            }
        });

        return { url: session.url };
    }
}