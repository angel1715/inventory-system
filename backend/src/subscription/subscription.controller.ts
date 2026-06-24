import { Controller, Post, Headers as NestHeaders, Req, BadRequestException, UseGuards, Body } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { StripeWebhookService } from './stripe.webhook.service';
import Stripe from 'stripe';
import { JwtAuthGuard } from '../auth/jwt.guard';

// Usamos una constante inicializada de forma segura
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
});

@Controller('subscription')
export class SubscriptionController {
    constructor(
        private readonly subscriptionService: SubscriptionService,
        private readonly stripeWebhookService: StripeWebhookService
    ) { }

    @Post('webhook')
    async handleStripeWebhook(
        @Req() req: any,
        @NestHeaders('stripe-signature') signature: string
    ) {
        if (!signature) throw new BadRequestException('Missing stripe-signature header');
        if (!req.rawBody) throw new BadRequestException('Webhook requires rawBody');

        let event: any;
        try {
            event = stripe.webhooks.constructEvent(
                req.rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (err: any) {
            console.error(`Webhook Error: ${err.message}`);
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }

        await this.stripeWebhookService.handleEvent(event);
        return { received: true };
    }

    @UseGuards(JwtAuthGuard)
    @Post('create-checkout-session')
    async createCheckoutSession(
        @Req() req: any,
        @Body('priceId') priceId: string // <--- CAPTURAR EL DATO AQUÍ
    ) {
        const user = req.user;

        if (!user || !user.id) {
            throw new BadRequestException('User information missing');
        }

        if (!priceId) {
            throw new BadRequestException('Price ID is required');
        }

        return await this.subscriptionService.createCheckoutSession(
            user.id,
            user.email,
            user.businessId,
            priceId // <--- PASARLO AL SERVICIO
        );
    }
}