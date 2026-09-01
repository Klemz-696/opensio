import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 Mo
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const FILENAME_REGEX = /^avatar_[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/;

@Injectable()
export class AvatarStorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.AVATAR_UPLOAD_DIR
      ? path.resolve(process.env.AVATAR_UPLOAD_DIR)
      : path.join(process.cwd(), 'uploads', 'avatars');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  async saveAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw new BadRequestException(
        `Le fichier dépasse la taille maximale autorisée de 2 Mo (${Math.round(file.size / 1024)} Ko).`,
      );
    }

    const mimeType = file.mimetype.toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Type de fichier non autorisé (${file.mimetype}). Formats acceptés : JPEG, PNG, WebP, GIF.`,
      );
    }

    this.validateMagicBytes(file.buffer, mimeType);

    const ext = EXTENSION_MAP[mimeType] || 'png';
    const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '');
    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const filename = `avatar_${safeUserId}_${Date.now()}_${randomSuffix}.${ext}`;

    const filePath = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    return filename;
  }

  async deleteAvatarByUrl(avatarUrl?: string | null): Promise<boolean> {
    if (!avatarUrl) return false;

    const basename = path.basename(avatarUrl);
    return this.deleteAvatarFile(basename);
  }

  async deleteAvatarFile(filename: string): Promise<boolean> {
    if (!FILENAME_REGEX.test(filename)) {
      return false;
    }

    const filePath = path.join(this.uploadDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
    } catch (err) {
      console.warn(`[AvatarStorageService] Impossible de supprimer ${filePath}:`, err);
    }
    return false;
  }

  getAvatarStream(filename: string): {
    stream: fs.ReadStream;
    contentType: string;
    size: number;
  } {
    if (!FILENAME_REGEX.test(filename)) {
      throw new BadRequestException('Nom de fichier invalide.');
    }

    const filePath = path.join(this.uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Photo de profil introuvable.');
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';
    const stream = fs.createReadStream(filePath);

    return {
      stream,
      contentType,
      size: stats.size,
    };
  }

  private validateMagicBytes(buffer: Buffer, mimeType: string): void {
    if (!buffer || buffer.length < 4) {
      throw new BadRequestException('Fichier image corrompu ou vide.');
    }

    if (mimeType === 'image/jpeg') {
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      if (!isJpeg) throw new BadRequestException('En-tête JPEG invalide.');
    } else if (mimeType === 'image/png') {
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      if (!isPng) throw new BadRequestException('En-tête PNG invalide.');
    } else if (mimeType === 'image/gif') {
      const isGif =
        buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46; // GIF
      if (!isGif) throw new BadRequestException('En-tête GIF invalide.');
    } else if (mimeType === 'image/webp') {
      const isRiff =
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46; // RIFF
      if (!isRiff) throw new BadRequestException('En-tête WebP invalide.');
    }
  }
}
