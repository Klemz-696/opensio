import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserRole, UserStatus } from '@prisma/client';
import { PasswordService } from './services/password.service';
import { PasswordResetService } from './services/password-reset.service';
import { JwtService } from './services/jwt.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { AuthService } from './services/auth.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const TEST_SECRET = 'b'.repeat(64);

describe.skipIf(!process.env.DATABASE_URL)('Auth Module — Tests d\'Intégration PostgreSQL (§29 / D-09)', () => {
  let prisma: PrismaService;
  let isDbConnected = false;
  let authService: AuthService;
  let passwordService: PasswordService;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;
  let auditService: AuditService;

  const testEmail = 'etudiant.auth.test@opensio.local';
  const initialPassword = 'InitialP@ssword123!';
  const updatedPassword = 'NewSecureP@ssword456!';

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.REGISTRATION_ENABLED = 'true';

    try {
      prisma = new PrismaService();
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ]);
      isDbConnected = true;

      auditService = new AuditService(prisma);
      passwordService = new PasswordService();
      jwtService = new JwtService();
      const passwordResetService = new PasswordResetService(prisma, passwordService, auditService);
      refreshTokenService = new RefreshTokenService(prisma, passwordService, auditService);
      authService = new AuthService(
        prisma,
        passwordService,
        jwtService,
        refreshTokenService,
        passwordResetService,
        auditService,
      );

      // Nettoyage préalable de l'utilisateur de test
      const existing = await prisma.user.findUnique({ where: { email: testEmail } });
      if (existing) {
        await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
        await prisma.passwordResetToken.deleteMany({ where: { userId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
      }
    } catch {
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    if (prisma && isDbConnected) {
      try {
        const existing = await prisma.user.findUnique({ where: { email: testEmail } });
        if (existing) {
          await prisma.auditLog.deleteMany({ where: { actorId: existing.id } });
          await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
          await prisma.passwordResetToken.deleteMany({ where: { userId: existing.id } });
          await prisma.user.delete({ where: { id: existing.id } });
        }
        await prisma.$disconnect();
      } catch {
        // Ignorer les erreurs de déconnexion
      }
    }
  });

  it('1. Inscription (POST /register) : crée l\'utilisateur avec hachage Argon2id et audit', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const result = await authService.register(
      {
        email: testEmail,
        displayName: 'Étudiant Test Auth',
        password: initialPassword,
      },
      '127.0.0.1',
    );

    expect(result).toBeDefined();
    expect(result.email).toBe(testEmail);
    expect(result.role).toBe(UserRole.STUDENT);
    expect(result.status).toBe(UserStatus.ACTIVE);

    // Vérification en base : le mot de passe est bien haché avec Argon2id
    const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(userInDb).toBeDefined();
    expect(userInDb!.passwordHash).toContain('$argon2id$');

    // Vérification de l'audit log
    const audit = await prisma.auditLog.findFirst({
      where: { actorId: userInDb!.id, action: 'AUTH_REGISTER' },
    });
    expect(audit).toBeDefined();
  });

  it('2. Inscription : rejette un doublon d\'adresse email (Conflict 409)', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    await expect(
      authService.register({
        email: testEmail,
        displayName: 'Doublon Test',
        password: initialPassword,
      }),
    ).rejects.toThrow('déjà utilisée');
  });

  it('3. Connexion (POST /login) : émet access token JWT HS256 et refresh token opaque', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const loginResult = await authService.login(
      {
        email: testEmail,
        password: initialPassword,
      },
      '127.0.0.1',
      'Integration-Test-Agent',
    );

    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
    expect(loginResult.refreshToken).toHaveLength(64);

    // Validation du token JWT
    const decoded = jwtService.verifyAccessToken(loginResult.accessToken);
    expect(decoded.email).toBe(testEmail);
    expect(decoded.role).toBe(UserRole.STUDENT);

    // Vérification du refresh token haché en SHA-256 en base
    const tokenHash = passwordService.hashToken(loginResult.refreshToken);
    const tokenInDb = await prisma.refreshToken.findFirst({ where: { tokenHash } });
    expect(tokenInDb).toBeDefined();
    expect(tokenInDb!.revokedAt).toBeNull();
  });

  it('4. Connexion : rejette de mauvais identifiants et logue l\'échec', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    await expect(
      authService.login({
        email: testEmail,
        password: 'MauvaisMotDePasse123!',
      }),
    ).rejects.toThrow('Identifiants invalides');

    const failAudit = await prisma.auditLog.findFirst({
      where: { action: 'AUTH_LOGIN_FAILED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(failAudit).toBeDefined();
  });

  it('5. Profil (GET /me) : retourne les informations de l\'utilisateur authentifié', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const userInDb = await prisma.user.findUnique({ where: { email: testEmail } });
    const me = await authService.getMe(userInDb!.id);

    expect(me.email).toBe(testEmail);
    expect(me.displayName).toBe('Étudiant Test Auth');
    expect(me.role).toBe(UserRole.STUDENT);
  });

  it('6. Rotation du refresh token (POST /refresh) : remplace l\'ancien token par un nouveau', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const loginRes = await authService.login({
      email: testEmail,
      password: initialPassword,
    });
    const token1 = loginRes.refreshToken;

    const refreshRes = await authService.refresh(token1, '127.0.0.1');
    const token2 = refreshRes.refreshToken;

    expect(token2).toBeDefined();
    expect(token2).not.toBe(token1);

    // L'ancien token (token1) doit être révoqué et pointer vers token2
    const token1Hash = passwordService.hashToken(token1);
    const token1InDb = await prisma.refreshToken.findFirst({ where: { tokenHash: token1Hash } });
    expect(token1InDb!.revokedAt).not.toBeNull();
    expect(token1InDb!.replacedById).toBeDefined();

    // Le nouveau token (token2) doit être actif
    const token2Hash = passwordService.hashToken(token2);
    const token2InDb = await prisma.refreshToken.findFirst({ where: { tokenHash: token2Hash } });
    expect(token2InDb!.revokedAt).toBeNull();
  });

  it('7. Sécurité & Détection de réutilisation (D-09) : réutiliser token1 révoque TOUTES les sessions', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    // On se connecte pour avoir tokenA, puis on fait un refresh pour obtenir tokenB
    const loginRes = await authService.login({ email: testEmail, password: initialPassword });
    const tokenA = loginRes.refreshToken;
    const refreshRes = await authService.refresh(tokenA, '127.0.0.1');
    const tokenB = refreshRes.refreshToken;

    // Tentative d'attaque : l'attaquant réutilise le tokenA (déjà révoqué)
    await expect(authService.refresh(tokenA, '192.168.1.99')).rejects.toThrow(
      'tentative de réutilisation d\'un jeton révoqué',
    );

    // Vérification : tokenB (qui était légitime) doit maintenant être AUSSI révoqué (révocation de toute la chaîne)
    const tokenBHash = passwordService.hashToken(tokenB);
    const tokenBInDb = await prisma.refreshToken.findFirst({ where: { tokenHash: tokenBHash } });
    expect(tokenBInDb!.revokedAt).not.toBeNull();

    // Et un nouvel appel avec tokenB doit être refusé
    await expect(authService.refresh(tokenB, '127.0.0.1')).rejects.toThrow();

    // Log d'audit de réutilisation présent
    const reuseAudit = await prisma.auditLog.findFirst({
      where: { action: 'AUTH_REFRESH_REUSE_DETECTED' },
    });
    expect(reuseAudit).toBeDefined();
  });

  it('8. Déconnexion (POST /logout) : révoque le refresh token actif', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const loginRes = await authService.login({ email: testEmail, password: initialPassword });
    await authService.logout(loginRes.refreshToken, '127.0.0.1');

    const tokenHash = passwordService.hashToken(loginRes.refreshToken);
    const tokenInDb = await prisma.refreshToken.findFirst({ where: { tokenHash } });
    expect(tokenInDb!.revokedAt).not.toBeNull();
  });

  it('9. Réinitialisation mot de passe : forgotPassword + resetPassword + login avec nouveau mot de passe', async (ctx) => {
    if (!isDbConnected) {
      ctx.skip();
      return;
    }

    const forgotRes = await authService.forgotPassword({ email: testEmail }, '127.0.0.1');
    expect(forgotRes.resetToken).toBeDefined();

    const resetRes = await authService.resetPassword(
      {
        token: forgotRes.resetToken!,
        newPassword: updatedPassword,
      },
      '127.0.0.1',
    );
    expect(resetRes.success).toBe(true);

    // L'ancien mot de passe ne doit plus fonctionner
    await expect(
      authService.login({ email: testEmail, password: initialPassword }),
    ).rejects.toThrow('Identifiants invalides');

    // Le nouveau mot de passe doit fonctionner
    const newLogin = await authService.login({ email: testEmail, password: updatedPassword });
    expect(newLogin.accessToken).toBeDefined();
  });
});
