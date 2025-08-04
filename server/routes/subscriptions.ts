import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { subscriptionService } from "../services/subscription-service";
import { 
  validateJWT, 
  validateRequest, 
  validateWebhookSignature,
  rateLimiters 
} from "../middleware/enhanced-security";
import { logger } from "../utils/monitoring";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Validation schemas
const createSubscriptionSchema = z.object({
  body: z.object({
    planId: z.string().min(1, "Plan ID is required"),
    paymentMethodId: z.string().optional(),
  }),
});

const updateSubscriptionSchema = z.object({
  body: z.object({
    planId: z.string().min(1, "Plan ID is required"),
  }),
});

const createPaymentMethodSchema = z.object({
  body: z.object({
    paymentMethodId: z.string().min(1, "Payment method ID is required"),
  }),
});

/**
 * @route GET /api/subscriptions/plans
 * @desc Get all available subscription plans
 * @access Public
 */
router.get("/plans", rateLimiters.api, (req, res) => {
  try {
    const plans = subscriptionService.getPlans();
    
    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    logger.error("Failed to get subscription plans", { error });
    
    res.status(500).json({
      success: false,
      error: "Failed to get subscription plans",
    });
  }
});

/**
 * @route GET /api/subscriptions/current
 * @desc Get user's current subscription
 * @access Private
 */
router.get(
  "/current",
  validateJWT,
  rateLimiters.api,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const subscription = await subscriptionService.getUserSubscription(userId);
      
      res.json({
        success: true,
        subscription,
      });
    } catch (error) {
      logger.error("Failed to get user subscription", {
        error,
        userId: req.user?.id,
      });
      
      res.status(500).json({
        success: false,
        error: "Failed to get subscription",
      });
    }
  }
);

/**
 * @route POST /api/subscriptions/create
 * @desc Create a new subscription
 * @access Private
 */
router.post(
  "/create",
  validateJWT,
  rateLimiters.api,
  validateRequest(createSubscriptionSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { planId, paymentMethodId } = req.body;

      const result = await subscriptionService.createSubscription(
        userId,
        planId,
        paymentMethodId
      );

      logger.info("Subscription creation initiated", {
        userId,
        planId,
        subscriptionId: result.subscriptionId,
      });

      res.json({
        success: true,
        subscriptionId: result.subscriptionId,
        clientSecret: result.clientSecret,
      });
    } catch (error) {
      logger.error("Failed to create subscription", {
        error,
        userId: req.user?.id,
        planId: req.body.planId,
      });

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route PUT /api/subscriptions/update
 * @desc Update subscription plan
 * @access Private
 */
router.put(
  "/update",
  validateJWT,
  rateLimiters.api,
  validateRequest(updateSubscriptionSchema),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { planId } = req.body;

      const result = await subscriptionService.updateSubscription(userId, planId);

      logger.info("Subscription updated", {
        userId,
        newPlanId: planId,
      });

      res.json({
        success: true,
        message: "Subscription updated successfully",
      });
    } catch (error) {
      logger.error("Failed to update subscription", {
        error,
        userId: req.user?.id,
        planId: req.body.planId,
      });

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route DELETE /api/subscriptions/cancel
 * @desc Cancel subscription
 * @access Private
 */
router.delete(
  "/cancel",
  validateJWT,
  rateLimiters.api,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const result = await subscriptionService.cancelSubscription(userId);

      logger.info("Subscription canceled", { userId });

      res.json({
        success: true,
        message: "Subscription canceled successfully",
      });
    } catch (error) {
      logger.error("Failed to cancel subscription", {
        error,
        userId: req.user?.id,
      });

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * @route GET /api/subscriptions/usage
 * @desc Get user's usage statistics
 * @access Private
 */
router.get(
  "/usage",
  validateJWT,
  rateLimiters.api,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { plan, usage } = await subscriptionService.getUserSubscription(userId);

      res.json({
        success: true,
        usage,
        limits: plan.limits,
        plan: plan.name,
      });
    } catch (error) {
      logger.error("Failed to get usage statistics", {
        error,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: "Failed to get usage statistics",
      });
    }
  }
);

/**
 * @route POST /api/subscriptions/check-limit
 * @desc Check if user can perform an action based on limits
 * @access Private
 */
router.post(
  "/check-limit",
  validateJWT,
  rateLimiters.api,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { action, amount = 1 } = req.body;

      if (!["notes", "storage", "aiRequests", "collaborators"].includes(action)) {
        return res.status(400).json({
          success: false,
          error: "Invalid action type",
        });
      }

      const result = await subscriptionService.checkUsageLimit(
        userId,
        action,
        amount
      );

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error("Failed to check usage limit", {
        error,
        userId: req.user?.id,
        action: req.body.action,
      });

      res.status(500).json({
        success: false,
        error: "Failed to check usage limit",
      });
    }
  }
);

/**
 * @route POST /api/subscriptions/setup-intent
 * @desc Create setup intent for payment method
 * @access Private
 */
router.post(
  "/setup-intent",
  validateJWT,
  rateLimiters.api,
  async (req, res) => {
    try {
      const userId = req.user.id;

      // Get or create Stripe customer
      let customerId = req.user.stripeCustomerId;
      if (!customerId) {
        customerId = await subscriptionService.createCustomer(
          userId,
          req.user.email,
          req.user.displayName || req.user.username
        );
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });

      res.json({
        success: true,
        clientSecret: setupIntent.client_secret,
      });
    } catch (error) {
      logger.error("Failed to create setup intent", {
        error,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: "Failed to create setup intent",
      });
    }
  }
);

/**
 * @route GET /api/subscriptions/payment-methods
 * @desc Get user's payment methods
 * @access Private
 */
router.get(
  "/payment-methods",
  validateJWT,
  rateLimiters.api,
  async (req, res) => {
    try {
      const customerId = req.user.stripeCustomerId;

      if (!customerId) {
        return res.json({
          success: true,
          paymentMethods: [],
        });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      res.json({
        success: true,
        paymentMethods: paymentMethods.data,
      });
    } catch (error) {
      logger.error("Failed to get payment methods", {
        error,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: "Failed to get payment methods",
      });
    }
  }
);

/**
 * @route DELETE /api/subscriptions/payment-methods/:id
 * @desc Delete a payment method
 * @access Private
 */
router.delete(
  "/payment-methods/:id",
  validateJWT,
  rateLimiters.api,
  async (req, res) => {
    try {
      const paymentMethodId = req.params.id;

      await stripe.paymentMethods.detach(paymentMethodId);

      logger.info("Payment method deleted", {
        userId: req.user.id,
        paymentMethodId,
      });

      res.json({
        success: true,
        message: "Payment method deleted successfully",
      });
    } catch (error) {
      logger.error("Failed to delete payment method", {
        error,
        userId: req.user?.id,
        paymentMethodId: req.params.id,
      });

      res.status(400).json({
        success: false,
        error: "Failed to delete payment method",
      });
    }
  }
);

/**
 * @route POST /api/subscriptions/webhook
 * @desc Handle Stripe webhooks
 * @access Public (but validated)
 */
router.post(
  "/webhook",
  validateWebhookSignature(process.env.STRIPE_WEBHOOK_SECRET!),
  async (req, res) => {
    try {
      const event = req.body as Stripe.Event;

      await subscriptionService.handleWebhook(event);

      logger.info("Webhook processed successfully", {
        eventType: event.type,
        eventId: event.id,
      });

      res.json({ received: true });
    } catch (error) {
      logger.error("Webhook processing failed", {
        error,
        eventType: req.body?.type,
        eventId: req.body?.id,
      });

      res.status(400).json({
        success: false,
        error: "Webhook processing failed",
      });
    }
  }
);

export default router;
