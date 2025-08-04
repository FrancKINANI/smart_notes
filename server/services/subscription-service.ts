import Stripe from "stripe";
import { db } from "../db";
import { users, subscriptions, usageTracking } from "../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger } from "../utils/monitoring";
import { EmailService } from "./email-service";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  limits: {
    notes: number;
    storage: number; // in MB
    aiRequests: number;
    collaborators: number;
  };
}

export interface UsageStats {
  notes: number;
  storage: number;
  aiRequests: number;
  collaborators: number;
}

export class SubscriptionService {
  private stripe: Stripe;
  private emailService: EmailService;

  // Subscription plans configuration
  private plans: Record<string, SubscriptionPlan> = {
    free: {
      id: "free",
      name: "Free",
      price: 0,
      interval: "month",
      features: [
        "Basic note-taking",
        "Up to 50 notes",
        "100MB storage",
        "Basic AI assistance",
      ],
      limits: {
        notes: 50,
        storage: 100,
        aiRequests: 10,
        collaborators: 0,
      },
    },
    pro: {
      id: "pro",
      name: "Pro",
      price: 999, // $9.99 in cents
      interval: "month",
      features: [
        "Unlimited notes",
        "5GB storage",
        "Advanced AI features",
        "Real-time collaboration",
        "Priority support",
      ],
      limits: {
        notes: -1, // unlimited
        storage: 5120, // 5GB in MB
        aiRequests: 1000,
        collaborators: 10,
      },
    },
    team: {
      id: "team",
      name: "Team",
      price: 1999, // $19.99 in cents
      interval: "month",
      features: [
        "Everything in Pro",
        "50GB storage",
        "Advanced analytics",
        "Team management",
        "Custom integrations",
      ],
      limits: {
        notes: -1,
        storage: 51200, // 50GB in MB
        aiRequests: 5000,
        collaborators: 50,
      },
    },
    enterprise: {
      id: "enterprise",
      name: "Enterprise",
      price: 4999, // $49.99 in cents
      interval: "month",
      features: [
        "Everything in Team",
        "Unlimited storage",
        "Custom AI models",
        "SSO integration",
        "Dedicated support",
      ],
      limits: {
        notes: -1,
        storage: -1,
        aiRequests: -1,
        collaborators: -1,
      },
    },
  };

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });
    this.emailService = new EmailService();
  }

  /**
   * Get all available subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return Object.values(this.plans);
  }

  /**
   * Get specific plan by ID
   */
  getPlan(planId: string): SubscriptionPlan | null {
    return this.plans[planId] || null;
  }

  /**
   * Create Stripe customer for user
   */
  async createCustomer(userId: number, email: string, name?: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId: userId.toString(),
        },
      });

      // Update user with Stripe customer ID
      await db
        .update(users)
        .set({
          stripeCustomerId: customer.id,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      logger.info("Stripe customer created", { userId, customerId: customer.id });
      return customer.id;
    } catch (error) {
      logger.error("Failed to create Stripe customer", { error, userId });
      throw error;
    }
  }

  /**
   * Create subscription for user
   */
  async createSubscription(
    userId: number,
    planId: string,
    paymentMethodId?: string
  ): Promise<{ clientSecret?: string; subscriptionId: string }> {
    try {
      const plan = this.getPlan(planId);
      if (!plan) {
        throw new Error("Invalid plan ID");
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error("User not found");
      }

      // Create customer if doesn't exist
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        customerId = await this.createCustomer(
          userId,
          user.email,
          user.displayName || user.username
        );
      }

      // For free plan, just update user subscription
      if (planId === "free") {
        await this.updateUserSubscription(userId, planId, "active");
        return { subscriptionId: "free" };
      }

      // Create Stripe price if not exists
      const priceId = await this.getOrCreatePrice(plan);

      // Create subscription
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          userId: userId.toString(),
          planId,
        },
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      // Save subscription to database
      await db.insert(subscriptions).values({
        userId,
        stripeSubscriptionId: subscription.id,
        planId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

      logger.info("Subscription created", {
        userId,
        subscriptionId: subscription.id,
        planId,
      });

      return {
        clientSecret: paymentIntent?.client_secret,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      logger.error("Failed to create subscription", { error, userId, planId });
      throw error;
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    userId: number,
    newPlanId: string
  ): Promise<{ success: boolean }> {
    try {
      const newPlan = this.getPlan(newPlanId);
      if (!newPlan) {
        throw new Error("Invalid plan ID");
      }

      // Get current subscription
      const [currentSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (!currentSub) {
        throw new Error("No active subscription found");
      }

      // Handle downgrade to free
      if (newPlanId === "free") {
        await this.cancelSubscription(userId);
        return { success: true };
      }

      // Update Stripe subscription
      const priceId = await this.getOrCreatePrice(newPlan);
      const subscription = await this.stripe.subscriptions.retrieve(
        currentSub.stripeSubscriptionId
      );

      await this.stripe.subscriptions.update(currentSub.stripeSubscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
      });

      // Update database
      await db
        .update(subscriptions)
        .set({
          planId: newPlanId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, currentSub.id));

      await this.updateUserSubscription(userId, newPlanId, "active");

      logger.info("Subscription updated", {
        userId,
        oldPlan: currentSub.planId,
        newPlan: newPlanId,
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to update subscription", { error, userId, newPlanId });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: number): Promise<{ success: boolean }> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      if (!subscription) {
        throw new Error("No active subscription found");
      }

      // Cancel Stripe subscription
      if (subscription.stripeSubscriptionId !== "free") {
        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }

      // Update database
      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id));

      await this.updateUserSubscription(userId, "free", "active");

      logger.info("Subscription canceled", { userId });
      return { success: true };
    } catch (error) {
      logger.error("Failed to cancel subscription", { error, userId });
      throw error;
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: number): Promise<{
    plan: SubscriptionPlan;
    status: string;
    currentPeriodEnd?: Date;
    usage: UsageStats;
  }> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      const planId = subscription?.planId || "free";
      const plan = this.getPlan(planId)!;
      const usage = await this.getUserUsage(userId);

      return {
        plan,
        status: subscription?.status || "active",
        currentPeriodEnd: subscription?.currentPeriodEnd,
        usage,
      };
    } catch (error) {
      logger.error("Failed to get user subscription", { error, userId });
      throw error;
    }
  }

  /**
   * Check if user can perform action based on limits
   */
  async checkUsageLimit(
    userId: number,
    action: "notes" | "storage" | "aiRequests" | "collaborators",
    amount: number = 1
  ): Promise<{ allowed: boolean; limit: number; current: number }> {
    try {
      const { plan, usage } = await this.getUserSubscription(userId);
      const limit = plan.limits[action];
      const current = usage[action];

      // Unlimited (-1) always allows
      if (limit === -1) {
        return { allowed: true, limit: -1, current };
      }

      const allowed = current + amount <= limit;

      return { allowed, limit, current };
    } catch (error) {
      logger.error("Failed to check usage limit", { error, userId, action });
      return { allowed: false, limit: 0, current: 0 };
    }
  }

  /**
   * Track usage for user
   */
  async trackUsage(
    userId: number,
    action: "notes" | "storage" | "aiRequests" | "collaborators",
    amount: number = 1
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if usage record exists for today
      const [existingUsage] = await db
        .select()
        .from(usageTracking)
        .where(
          and(
            eq(usageTracking.userId, userId),
            gte(usageTracking.date, today)
          )
        )
        .limit(1);

      if (existingUsage) {
        // Update existing record
        const updateData: any = {
          updatedAt: new Date(),
        };
        updateData[action] = existingUsage[action] + amount;

        await db
          .update(usageTracking)
          .set(updateData)
          .where(eq(usageTracking.id, existingUsage.id));
      } else {
        // Create new record
        const insertData: any = {
          userId,
          date: today,
          notes: 0,
          storage: 0,
          aiRequests: 0,
          collaborators: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        insertData[action] = amount;

        await db.insert(usageTracking).values(insertData);
      }

      logger.debug("Usage tracked", { userId, action, amount });
    } catch (error) {
      logger.error("Failed to track usage", { error, userId, action, amount });
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "customer.subscription.updated":
        case "customer.subscription.created":
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case "invoice.payment_succeeded":
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          logger.info("Unhandled webhook event", { type: event.type });
      }
    } catch (error) {
      logger.error("Webhook handling failed", { error, eventType: event.type });
      throw error;
    }
  }

  /**
   * Get or create Stripe price for plan
   */
  private async getOrCreatePrice(plan: SubscriptionPlan): Promise<string> {
    try {
      // Try to find existing price
      const prices = await this.stripe.prices.list({
        product: plan.id,
        active: true,
      });

      if (prices.data.length > 0) {
        return prices.data[0].id;
      }

      // Create new price
      const price = await this.stripe.prices.create({
        unit_amount: plan.price,
        currency: "usd",
        recurring: { interval: plan.interval },
        product_data: {
          name: `SmartNotes ${plan.name}`,
          description: plan.features.join(", "),
        },
        metadata: {
          planId: plan.id,
        },
      });

      return price.id;
    } catch (error) {
      logger.error("Failed to get or create price", { error, planId: plan.id });
      throw error;
    }
  }

  /**
   * Update user subscription in database
   */
  private async updateUserSubscription(
    userId: number,
    planId: string,
    status: string
  ): Promise<void> {
    await db
      .update(users)
      .set({
        subscriptionPlan: planId,
        subscriptionStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Get user's current usage stats
   */
  private async getUserUsage(userId: number): Promise<UsageStats> {
    try {
      // Get current month usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const usageRecords = await db
        .select()
        .from(usageTracking)
        .where(
          and(
            eq(usageTracking.userId, userId),
            gte(usageTracking.date, startOfMonth),
            lte(usageTracking.date, endOfMonth)
          )
        );

      // Aggregate usage
      const usage: UsageStats = {
        notes: 0,
        storage: 0,
        aiRequests: 0,
        collaborators: 0,
      };

      for (const record of usageRecords) {
        usage.notes += record.notes;
        usage.storage += record.storage;
        usage.aiRequests += record.aiRequests;
        usage.collaborators = Math.max(usage.collaborators, record.collaborators);
      }

      return usage;
    } catch (error) {
      logger.error("Failed to get user usage", { error, userId });
      return { notes: 0, storage: 0, aiRequests: 0, collaborators: 0 };
    }
  }

  /**
   * Handle subscription updated webhook
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = parseInt(subscription.metadata.userId);
    const planId = subscription.metadata.planId;

    await db
      .update(subscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    await this.updateUserSubscription(userId, planId, subscription.status);

    logger.info("Subscription updated via webhook", {
      userId,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = parseInt(subscription.metadata.userId);

    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

    await this.updateUserSubscription(userId, "free", "active");

    logger.info("Subscription deleted via webhook", {
      userId,
      subscriptionId: subscription.id,
    });
  }

  /**
   * Handle payment succeeded webhook
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const subscription = await this.stripe.subscriptions.retrieve(
        invoice.subscription as string
      );
      const userId = parseInt(subscription.metadata.userId);
      const planId = subscription.metadata.planId;
      const plan = this.getPlan(planId);

      if (plan && userId) {
        // Get user for email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user) {
          await this.emailService.sendSubscriptionConfirmation(
            user.email,
            user.username,
            plan.name,
            plan.price
          );
        }

        logger.info("Payment succeeded", {
          userId,
          subscriptionId: subscription.id,
          amount: invoice.amount_paid,
        });
      }
    }
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const subscription = await this.stripe.subscriptions.retrieve(
        invoice.subscription as string
      );
      const userId = parseInt(subscription.metadata.userId);

      // Send payment failed notification
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user) {
        await this.emailService.sendNotificationEmail(
          user.email,
          user.username,
          "Payment Failed",
          "Your recent payment failed. Please update your payment method to continue using SmartNotes premium features.",
          `${process.env.CLIENT_URL}/account/billing`
        );
      }

      logger.warn("Payment failed", {
        userId,
        subscriptionId: subscription.id,
        amount: invoice.amount_due,
      });
    }
  }
}

export const subscriptionService = new SubscriptionService();
