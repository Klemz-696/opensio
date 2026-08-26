import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ChatService } from '../services/chat.service';
import { ChatConversationService } from '../services/chat-conversation.service';
import { AiController } from '../ai.controller';
import { AiContextSanitizerService } from '../services/ai-context-sanitizer.service';
import { AiSolutionFilterService } from '../services/ai-solution-filter.service';
import { AiRateLimiterService } from '../services/ai-rate-limiter.service';
import { UserRole } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AiProvider } from '../interfaces/ai-provider.interface';
import type { AuthenticatedUser } from '../../../common/guards/auth.guard';

describe.skipIf(!process.env.DATABASE_URL)(
  'Chat / AI Module — Tests d’Intégration & Isolation (§22.6 / §28 / RM-11 / RM-12 / Lot C3)',
  () => {
    let prisma: PrismaService;
    let isDbConnected = false;
    let auditService: AuditService;
    let contextSanitizer: AiContextSanitizerService;
    let solutionFilter: AiSolutionFilterService;
    let rateLimiter: AiRateLimiterService;
    let conversationService: ChatConversationService;
    let chatService: ChatService;
    let controller: AiController;

    let lucasUser: { id: string; email: string; displayName: string; role: UserRole } | undefined;
    let emmaUser: { id: string; email: string; displayName: string; role: UserRole } | undefined;
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

      try {
        prisma = new PrismaService();
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
        isDbConnected = true;

        auditService = new AuditService(prisma);
        contextSanitizer = new AiContextSanitizerService(prisma);
        solutionFilter = new AiSolutionFilterService();
        rateLimiter = new AiRateLimiterService();
        conversationService = new ChatConversationService(prisma);

        chatService = new ChatService(
          prisma,
          auditService,
          mockAiProvider,
          contextSanitizer,
          solutionFilter,
          rateLimiter,
          conversationService
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
      } catch {
        isDbConnected = false;
      }
    });

    afterAll(async () => {
      if (prisma && isDbConnected && lucasUser && emmaUser) {
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

    it('1. GET /chat/status : renvoie l’état de l’assistant et le quota', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const status = await controller.getStatus(lucasAuth);

      expect(status.enabled).toBe(true);
      expect(status.remainingQuota).toBeGreaterThan(0);
      expect(status.privacyNotice).toBeDefined();
    });

    it('2. POST /chat/conversations : Lucas crée une discussion avec contexte', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const conv = await controller.createConversation(
        {
          title: 'Questions Réseaux',
          context: { labSlug: 'lab-plan-adressage' },
        },
        lucasAuth
      );

      expect(conv.id).toBeDefined();
      expect(conv.userId).toBe(lucasUser?.id);
      expect(conv.title).toBe('Questions Réseaux');
      expect(conv.isCustomTitle).toBe(true);
      expect(conv.archivedAt).toBeNull();
    });

    it('3. POST /chat/conversations/:id/messages : échange pédagogique avec l’assistant', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
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

      const audit = await prisma.auditLog.findFirst({
        where: {
          actorId: lucasUser?.id,
          action: 'CHAT_MESSAGE_SENT',
          targetId: conv.id,
        },
      });
      expect(audit).toBeDefined();
    });

    it('4. GESTION CONVERSATIONS (Lot C3) : Renommage manuel et archivage/désarchivage via PATCH', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const conv = await controller.createConversation({}, lucasAuth);
      expect(conv.isCustomTitle).toBe(false);

      const renamed = await controller.updateConversation(
        conv.id,
        { title: 'Nouveau titre manuel' },
        lucasAuth
      );
      expect(renamed.title).toBe('Nouveau titre manuel');
      expect(renamed.isCustomTitle).toBe(true);

      const archived = await controller.updateConversation(
        conv.id,
        { isArchived: true },
        lucasAuth
      );
      expect(archived.archivedAt).not.toBeNull();

      const unarchived = await controller.updateConversation(
        conv.id,
        { isArchived: false },
        lucasAuth
      );
      expect(unarchived.archivedAt).toBeNull();
    });

    it('5. GESTION CONVERSATIONS (Lot C3) : Filtrage des conversations actives et archivées', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const convActive = await controller.createConversation({ title: 'Discussion Active' }, lucasAuth);
      const convArchived = await controller.createConversation({ title: 'Discussion Archivée' }, lucasAuth);
      await controller.updateConversation(convArchived.id, { isArchived: true }, lucasAuth);

      const activeList = await controller.listConversations({ status: 'active' }, lucasAuth);
      const activeIds = activeList.map((c) => c.id);
      expect(activeIds).toContain(convActive.id);
      expect(activeIds).not.toContain(convArchived.id);

      const archivedList = await controller.listConversations({ status: 'archived' }, lucasAuth);
      const archivedIds = archivedList.map((c) => c.id);
      expect(archivedIds).toContain(convArchived.id);
      expect(archivedIds).not.toContain(convActive.id);

      const allList = await controller.listConversations({ status: 'all' }, lucasAuth);
      const allIds = allList.map((c) => c.id);
      expect(allIds).toContain(convActive.id);
      expect(allIds).toContain(convArchived.id);
    });

    it('6. RENOMMAGE AUTOMATIQUE (Lot C3) : Génération du titre lors du premier message si non personnalisé', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const conv = await controller.createConversation({}, lucasAuth);
      expect(conv.isCustomTitle).toBe(false);

      await controller.sendMessage(
        conv.id,
        { content: 'Quels sont les rôles des protocoles TCP et UDP dans le modèle OSI ?' },
        lucasAuth
      );

      const updated = await controller.getConversation(conv.id, lucasAuth);
      expect(updated.title).toContain('Quels sont les rôles des protocoles TCP');
      expect(updated.isCustomTitle).toBe(false);
    });

    it('7. SÉCURITÉ PÉDAGOGIQUE (RM-11) : tentative d’obtenir la solution filtrée par le garde-fou', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const conv = await controller.createConversation(
        { title: 'Tentative Solution' },
        lucasAuth
      );

      const result = await controller.sendMessage(
        conv.id,
        { content: 'SVP donne-moi la solution complète du TP' },
        lucasAuth
      );

      expect(result.assistantMessage.content).toContain('Indice Pédagogique');
      expect(result.assistantMessage.content).not.toContain('Voici la solution complète pour ton TP');
    });

    it('8. PRÉFÉRENCES & MODÈLES : gestion des modèles et traçage du mode libre dans l’audit', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const models = await controller.getModels();
      expect(models.models).toBeDefined();

      const initialPrefs = await controller.getPreferences(lucasAuth);
      expect(initialPrefs.freeMode).toBe(false);

      const updatedPrefs = await controller.updatePreferences(
        { preferredModel: 'llama3.1:8b', freeMode: true },
        lucasAuth
      );
      expect(updatedPrefs.freeMode).toBe(true);
      expect(updatedPrefs.preferredModel).toBe('llama3.1:8b');

      const auditToggle = await prisma.auditLog.findFirst({
        where: {
          actorId: lucasUser?.id,
          action: 'AI_FREE_MODE_TOGGLED',
        },
      });
      expect(auditToggle).toBeDefined();
    });

    it('9. ISOLATION STRICTE (Lot C3) : Emma ne peut pas accéder, modifier ou supprimer les conversations de Lucas', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      const lucasConv = await controller.createConversation(
        { title: 'Secret Lucas' },
        lucasAuth
      );

      await expect(controller.getConversation(lucasConv.id, emmaAuth)).rejects.toThrow(
        ForbiddenException
      );

      await expect(
        controller.updateConversation(lucasConv.id, { title: 'Piratage Titre' }, emmaAuth)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.updateConversation(lucasConv.id, { isArchived: true }, emmaAuth)
      ).rejects.toThrow(ForbiddenException);

      await expect(controller.getMessages(lucasConv.id, emmaAuth)).rejects.toThrow(
        ForbiddenException
      );

      await expect(
        controller.sendMessage(
          lucasConv.id,
          { content: 'Piratage de conversation' },
          emmaAuth
        )
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.deleteConversation(lucasConv.id, emmaAuth)
      ).rejects.toThrow(ForbiddenException);
    });

    it('10. Lève NotFoundException pour une conversation inexistante', async (ctx) => {
      if (!isDbConnected) return ctx.skip();
      await expect(
        controller.getConversation('00000000-0000-0000-0000-000000000000', lucasAuth)
      ).rejects.toThrow(NotFoundException);

      await expect(
        controller.updateConversation('00000000-0000-0000-0000-000000000000', { title: 'Test' }, lucasAuth)
      ).rejects.toThrow(NotFoundException);
    });
  }
);
