import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { WebSocket, type Server } from 'ws';
import { JwtService } from '../auth/services/jwt.service';
import { TerminalService } from './services/terminal.service';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
}

type AuthenticatedSocket = AuthenticatedWebSocket;

@WebSocketGateway({ path: '/ws/terminal' })
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TerminalGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly terminalService: TerminalService
  ) {}

  /**
   * Gestion de la connexion WebSocket entrante avec authentification JWT et validation de session.
   */
  async handleConnection(client: AuthenticatedSocket, req: IncomingMessage) {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      const sessionId = url.searchParams.get('sessionId');

      if (!token || !sessionId) {
        this.logger.warn('[TerminalGateway] Connexion rejetée : token ou sessionId manquant');
        client.close(4401, 'Jeton ou identifiant de session manquant');
        return;
      }

      // 1. Validation du jeton JWT
      let payload;
      try {
        payload = this.jwtService.verifyAccessToken(token);
      } catch {
        this.logger.warn('[TerminalGateway] Connexion rejetée : jeton JWT invalide');
        client.close(4401, 'Jeton JWT invalide ou expiré');
        return;
      }

      const userId = payload.sub;

      // 2. Vérification stricte de l'appartenance de la session
      await this.terminalService.getAndVerifySession(sessionId, userId);

      client.userId = userId;
      client.sessionId = sessionId;
      client.isAlive = true;

      // 3. Récupérer statut et bannière initiale
      const status = await this.terminalService.getTerminalStatus(sessionId, userId);

      client.send(
        JSON.stringify({
          event: 'ready',
          data: status,
        })
      );

      this.logger.log(`[TerminalGateway] Client connecté pour session ${sessionId} (user: ${userId})`);
    } catch (err: unknown) {
      this.logger.error(`[TerminalGateway] Erreur de connexion : ${String(err)}`);
      client.close(4403, 'Accès non autorisé à la session');
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(
      `[TerminalGateway] Client déconnecté (session: ${client.sessionId || 'inconnue'})`
    );
  }

  /**
   * Réception et exécution d'une commande via le canal WebSocket.
   */
  @SubscribeMessage('command')
  async handleCommand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: string | { command: string }
  ) {
    if (!client.userId || !client.sessionId) {
      client.send(
        JSON.stringify({
          event: 'error',
          data: { message: 'Connexion non authentifiée' },
        })
      );
      return;
    }

    const commandStr = typeof data === 'string' ? data : data?.command || '';

    try {
      const result = await this.terminalService.executeCommand(
        client.sessionId,
        client.userId,
        commandStr
      );

      client.send(
        JSON.stringify({
          event: 'output',
          data: result,
        })
      );
    } catch (err: unknown) {
      client.send(
        JSON.stringify({
          event: 'error',
          data: { message: String(err) },
        })
      );
    }
  }
}
