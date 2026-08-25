import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TerminalGateway } from '../terminal.gateway';
import type { JwtService } from '../../auth/services/jwt.service';
import type { TerminalService } from '../services/terminal.service';
import { UserRole } from '@prisma/client';

import type { IncomingMessage } from 'node:http';
import type { AuthenticatedWebSocket } from '../terminal.gateway';

interface MockJwtService {
  verifyAccessToken: ReturnType<typeof vi.fn>;
}

interface MockTerminalService {
  getAndVerifySession: ReturnType<typeof vi.fn>;
  getTerminalStatus: ReturnType<typeof vi.fn>;
  executeCommand: ReturnType<typeof vi.fn>;
}

describe('TerminalGateway (WebSocket Auth & Isolation)', () => {
  let gateway: TerminalGateway;
  let mockJwtService: MockJwtService;
  let mockTerminalService: MockTerminalService;
  let mockSocket: AuthenticatedWebSocket;

  beforeEach(() => {
    mockJwtService = {
      verifyAccessToken: vi.fn(),
    };

    mockTerminalService = {
      getAndVerifySession: vi.fn(),
      getTerminalStatus: vi.fn().mockResolvedValue({
        active: true,
        sessionId: 'session-1',
        labSlug: 'lab-dns',
        prompt: 'student@opensio-lab:~$ ',
        banner: 'Welcome to OpenSIO Lab',
      }),
      executeCommand: vi.fn().mockResolvedValue({
        stdout: '192.168.1.50',
        stderr: '',
        exitCode: 0,
        cwd: '',
      }),
    };

    gateway = new TerminalGateway(
      mockJwtService as unknown as JwtService,
      mockTerminalService as unknown as TerminalService
    );

    mockSocket = {
      close: vi.fn(),
      send: vi.fn(),
    } as unknown as AuthenticatedWebSocket;
  });

  it('ferme la connexion WebSocket (4401) si le token ou sessionId est manquant', async () => {
    const reqWithoutParams = { url: '/ws/terminal' } as unknown as IncomingMessage;
    await gateway.handleConnection(mockSocket, reqWithoutParams);

    expect(mockSocket.close).toHaveBeenCalledWith(4401, expect.any(String));
  });

  it('ferme la connexion (4401) si le JWT est invalide ou expiré', async () => {
    mockJwtService.verifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const reqWithBadToken = { url: '/ws/terminal?token=bad-token&sessionId=session-1' } as unknown as IncomingMessage;
    await gateway.handleConnection(mockSocket, reqWithBadToken);

    expect(mockSocket.close).toHaveBeenCalledWith(4401, expect.any(String));
  });

  it('ferme la connexion (4403) si la session n’appartient pas à l’utilisateur (isolation)', async () => {
    mockJwtService.verifyAccessToken.mockReturnValue({
      sub: 'user-emma',
      role: UserRole.STUDENT,
      email: 'emma@opensio.local',
      displayName: 'Emma',
    });

    mockTerminalService.getAndVerifySession.mockRejectedValue(
      new Error("Vous n'êtes pas autorisé à accéder au terminal de cette session.")
    );

    const req = { url: '/ws/terminal?token=emma-token&sessionId=lucas-session' } as unknown as IncomingMessage;
    await gateway.handleConnection(mockSocket, req);

    expect(mockSocket.close).toHaveBeenCalledWith(4403, expect.any(String));
  });

  it('authentifie avec succès et envoie le message "ready" avec le prompt', async () => {
    mockJwtService.verifyAccessToken.mockReturnValue({
      sub: 'user-lucas',
      role: UserRole.STUDENT,
      email: 'lucas@opensio.local',
      displayName: 'Lucas',
    });

    mockTerminalService.getAndVerifySession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-lucas',
    });

    const req = { url: '/ws/terminal?token=valid-token&sessionId=session-1' } as unknown as IncomingMessage;
    await gateway.handleConnection(mockSocket, req);

    expect(mockSocket.userId).toBe('user-lucas');
    expect(mockSocket.sessionId).toBe('session-1');
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('"event":"ready"')
    );
  });

  it('exécute une commande reçue et renvoie l’événement output', async () => {
    mockSocket.userId = 'user-lucas';
    mockSocket.sessionId = 'session-1';

    await gateway.handleCommand(mockSocket, { command: 'ip a' });

    expect(mockTerminalService.executeCommand).toHaveBeenCalledWith(
      'session-1',
      'user-lucas',
      'ip a'
    );
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('"event":"output"')
    );
  });
});
