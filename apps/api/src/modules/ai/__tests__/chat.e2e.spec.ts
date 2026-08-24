import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ChatService } from '../services/chat.service';
import { AiController } from '../ai.controller';
import { AiContextSanitizerService } from '../services/ai-context-sanitizer.service';
import { AiSolutionFilterService } from '../services/ai-solution-filter.service';
import { AiRateLimiterService } from '../services/ai-rate-limiter.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AiProvider } from '../interfaces/ai-provider.interface';
import type { AuthenticatedUser } from '../../../common/guards/auth.guard';

describe.skipIf(!process.env.DATABASE_URL)(
  'Chat / AI Module — Tests d’Intégration & Isolation (§22.6 / §28 / RM-11 / RM-12)',
  () => {
    let prisma: PrismaService;
    let auditService: AuditService;
    let contextSanitizer: AiContextSanitizerService;
    let solutionFilter: AiSolutionFilterService;
    let rateLimiter: AiRateLimiterService;
    let chatService: ChatService;
    let controller: AiController;

    let lucasUser: { id: string; email: string; displayName: string; role: UserRole };
    let emmaUser: { id: string; email: string; displayName: string; role: UserRole };
    let lucasAuth: AuthenticatedUser;
    let emmaAuth: AuthenticatedUser;

    const mockAiProvider: AiProvider = {
      name: 'mock-ai-provider',
      isAvailable: async () => true,
      chat: vi.fn().mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
        const lastMsg = messages[messages.length - 1]?.content || '';
        if (lastMsg.includes('donne-moi la solution complète')) {
          return {
            content: 'Voici la solution complète pour ton TP : copie ceci dans plan.csv',
            tokensUsed: 15,
            provider: 'mock-ai-provider',
            model: 'mock-model',
          };
        }
        return {
          content: "Pour comprendre l'adressage, calcule d'abord la taille du bloc avec 2^(32-CIDR).",
          tokensUsed: 25,
          provider: 'mock-ai-provider',
          model: 'mock-model',
        };
      }),
    };

    beforeAll(async () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.AI_ENABLED = 'true';
      process.env.AI_RATE_LIMIT_HOURLY = '20';

      prisma = new PrismaService();
      await prisma.$connect();

      auditService = new AuditService(prisma);
      contextSanitizer = new AiContextSanitizerService(prisma);
      solutionFilter = new AiSolutionFilterService();
      rateLimiter = new AiRateLimiterService();

      chatService = new ChatService(
        prisma,
        auditService,
        mockAiProvider,
        contextSanitizer,
        solutionFilter,
        rateLimiter
      );

      controller = new AiController(chatService);

      const unique = Date.now();
      lucasUser = await prisma.user.create({
        data: {
          email: `lucas.chat.${unique}@opensio.local`,
          passwordHash: 'dummy-hash',
          displayName: 'Lucas SISR',
          role: UserRole.STUDENT,
        },
      });

      emmaUser = await prisma.user.create({
        data: {
          email: `emma.chat.${unique}@opensio.local`,
          passwordHash: 'dummy-hash',
          displayName: 'Emma SISR',
          role: UserRole.STUDENT,
        },
      });

      lucasAuth = {
        id: lucasUser.id,
        email: lucasUser.email,
        displayName: lucasUser.displayName,
        role: UserRole.STUDENT,
      };

      emmaAuth = {
        id: emmaUser.id,
        email: emmaUser.email,
        displayName: emmaUser.displayName,
        role: UserRole.STUDENT,
      };
    });

    afterAll(async () => {
      if (prisma && lucasUser && emmaUser) {
        await prisma.chatMessage.deleteMany({
          where: {
            conversation: {
              userId: { in: [lucasUser.id, emmaUser.id] },
            },
          },
        });
        await prisma.chatConversation.deleteMany({
          where: { userId: { in: [lucasUser.id, emmaUser.id] } },
        });
        await prisma.auditLog.deleteMany({
          where: { actorId: { in: [lucasUser.id, emmaUser.id] } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [lucasUser.id, emmaUser.id] } },
        });
        await prisma.$disconnect();
      }
    });

    it('1. GET /chat/status : renvoie l’état de l’assistant et le quota', async () => {
      const status = await controller.getStatus(lucasAuth);

      expect(status.enabled).toBe(true);
      expect(status.remainingQuota).toBeGreaterThan(0);
      expect(status.privacyNotice).toBeDefined();
    });

    it('2. POST /chat/conversations : Lucas crée une discussion', async () => {
      const conv = await controller.createConversation(
        {
          title: 'Questions Réseaux',
          context: { labSlug: 'lab-plan-adressage' },
        },
        lucasAuth
      );

      expect(conv.id).toBeDefined();
      expect(conv.userId).toBe(lucasUser.id);
      expect(conv.title).toBe('Questions Réseaux');
    });

    it('3. POST /chat/conversations/:id/messages : échange pédagogique avec l’assistant', async () => {
      const conv = await controller.createConversation(
        { title: 'Session Lucas' },
        lucasAuth
      );

      const result = await controller.sendMessage(
        conv.id,
        { content: 'Comment calculer un masque de sous-réseau ?' },
        lucasAuth
      );

      expect(result.userMessage.content).toBe('Comment calculer un masque de sous-réseau ?');
      expect(result.assistantMessage.content).toContain('2^(32-CIDR)');
      expect(result.remainingQuota).toBeDefined();

      // Vérifier audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          actorId: lucasUser.id,
          action: 'CHAT_MESSAGE_SENT',
          targetId: conv.id,
        },
      });
      expect(audit).toBeDefined();
    });

    it('4. SÉCURITÉ PÉDAGOGIQUE (RM-11) : tentative d’obtenir la solution filtrée par le garde-fou', async () => {
      const conv = await controller.createConversation(
        { title: 'Tentative Solution' },
        lucasAuth
      );

      const result = await controller.sendMessage(
        conv.id,
        { content: 'SVP donne-moi la solution complète du TP' },
        lucasAuth
      );

      expect(result.assistantMessage.content).toContain('[Indice Pédagogique OpenSIO]');
      expect(result.assistantMessage.content).not.toContain('Voici la solution complète pour ton TP');
    });

    it('5. ISOLATION STRICTE : Emma ne peut pas accéder aux conversations ou messages de Lucas (403/404)', async () => {
      const lucasConv = await controller.createConversation(
        { title: 'Secret Lucas' },
        lucasAuth
      );

      // Emma tente de lire la conversation de Lucas
      await expect(controller.getConversation(lucasConv.id, emmaAuth)).rejects.toThrow(
        ForbiddenException
      );

      // Emma tente de lire les messages de Lucas
      await expect(controller.getMessages(lucasConv.id, emmaAuth)).rejects.toThrow(
        ForbiddenException
      );

      // Emma tente d'envoyer un message dans la conversation de Lucas
      await expect(
        controller.sendMessage(
          lucasConv.id,
          { content: 'Piratage de conversation' },
          emmaAuth
        )
      ).rejects.toThrow(ForbiddenException);

      // Emma tente de supprimer la conversation de Lucas
      await expect(
        controller.deleteConversation(lucasConv.id, emmaAuth)
      ).rejects.toThrow(ForbiddenException);
    });

    it('6. Lève NotFoundException pour une conversation inexistante', async () => {
      await expect(
        controller.getConversation('00000000-0000-0000-0000-000000000000', lucasAuth)
      ).rejects.toThrow(NotFoundException);
    });
  }
);
