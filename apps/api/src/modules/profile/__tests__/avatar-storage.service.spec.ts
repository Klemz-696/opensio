import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AvatarStorageService } from '../avatar-storage.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AvatarStorageService', () => {
  let service: AvatarStorageService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(process.cwd(), 'tmp_test_uploads', `test_${Date.now()}`);
    process.env.AVATAR_UPLOAD_DIR = tempDir;
    service = new AvatarStorageService();
  });

  afterEach(async () => {
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('devrait créer le dossier de stockage s\'il n\'existe pas', () => {
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  it('devrait rejeter un fichier vide ou absent', async () => {
    await expect(service.saveAvatar('user-1', null as unknown as Express.Multer.File)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('devrait rejeter un fichier dépassant 2 Mo', async () => {
    const hugeBuffer = Buffer.alloc(2 * 1024 * 1024 + 100);
    const mockFile: Express.Multer.File = {
      buffer: hugeBuffer,
      size: hugeBuffer.length,
      mimetype: 'image/png',
      fieldname: 'avatar',
      originalname: 'huge.png',
      encoding: '7bit',
      stream: null as unknown as import('stream').Readable,
      destination: '',
      filename: '',
      path: '',
    };

    await expect(service.saveAvatar('user-1', mockFile)).rejects.toThrow(
      /dépasse la taille maximale autorisée de 2 Mo/,
    );
  });

  it('devrait rejeter un type MIME non autorisé', async () => {
    const buffer = Buffer.from('console.log("malicious");');
    const mockFile: Express.Multer.File = {
      buffer,
      size: buffer.length,
      mimetype: 'application/javascript',
      fieldname: 'avatar',
      originalname: 'script.js',
      encoding: '7bit',
      stream: null as unknown as import('stream').Readable,
      destination: '',
      filename: '',
      path: '',
    };

    await expect(service.saveAvatar('user-1', mockFile)).rejects.toThrow(
      /Type de fichier non autorisé/,
    );
  });

  it('devrait rejeter un faux fichier PNG avec en-tête invalide (magic bytes)', async () => {
    const fakeBuffer = Buffer.from('FAKEPNGDATAWITHINVALIDMAGICBYTES');
    const mockFile: Express.Multer.File = {
      buffer: fakeBuffer,
      size: fakeBuffer.length,
      mimetype: 'image/png',
      fieldname: 'avatar',
      originalname: 'fake.png',
      encoding: '7bit',
      stream: null as unknown as import('stream').Readable,
      destination: '',
      filename: '',
      path: '',
    };

    await expect(service.saveAvatar('user-1', mockFile)).rejects.toThrow(
      /En-tête PNG invalide/,
    );
  });

  it('devrait enregistrer avec succès un fichier PNG valide', async () => {
    // Magic bytes PNG : 0x89, 0x50, 0x4e, 0x47 + payload
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const mockFile: Express.Multer.File = {
      buffer: pngBuffer,
      size: pngBuffer.length,
      mimetype: 'image/png',
      fieldname: 'avatar',
      originalname: 'my-avatar.png',
      encoding: '7bit',
      stream: null as unknown as import('stream').Readable,
      destination: '',
      filename: '',
      path: '',
    };

    const filename = await service.saveAvatar('user-123', mockFile);

    expect(filename).toMatch(/^avatar_user123_\d+_[a-f0-9]+\.png$/);
    expect(fs.existsSync(path.join(tempDir, filename))).toBe(true);
  });

  it('devrait enregistrer avec succès un fichier JPEG valide', async () => {
    // Magic bytes JPEG : 0xff, 0xd8, 0xff + payload
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const mockFile: Express.Multer.File = {
      buffer: jpegBuffer,
      size: jpegBuffer.length,
      mimetype: 'image/jpeg',
      fieldname: 'avatar',
      originalname: 'photo.jpg',
      encoding: '7bit',
      stream: null as unknown as import('stream').Readable,
      destination: '',
      filename: '',
      path: '',
    };

    const filename = await service.saveAvatar('user-456', mockFile);

    expect(filename).toMatch(/^avatar_user456_\d+_[a-f0-9]+\.jpg$/);
    expect(fs.existsSync(path.join(tempDir, filename))).toBe(true);
  });

  it('devrait supprimer un avatar via son URL ou son nom de fichier', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]);
    const mockFile: Express.Multer.File = {
      buffer: pngBuffer,
      size: pngBuffer.length,
      mimetype: 'image/png',
      fieldname: 'avatar',
      originalname: 'avatar.png',
      encoding: '7bit',
      stream: null as unknown as import('stream').Readable,
      destination: '',
      filename: '',
      path: '',
    };

    const filename = await service.saveAvatar('user-999', mockFile);
    expect(fs.existsSync(path.join(tempDir, filename))).toBe(true);

    const deleted = await service.deleteAvatarByUrl(`/api/v1/users/avatar/${filename}`);
    expect(deleted).toBe(true);
    expect(fs.existsSync(path.join(tempDir, filename))).toBe(false);
  });

  it('devrait protéger contre le path traversal lors de la lecture ou suppression', () => {
    expect(() => service.getAvatarStream('../../../etc/passwd')).toThrow(
      BadRequestException,
    );
    expect(() => service.getAvatarStream('avatar_../../secret.png')).toThrow(
      BadRequestException,
    );
  });

  it('devrait lever NotFoundException si le fichier n\'existe pas', () => {
    expect(() => service.getAvatarStream('avatar_user_123456_abcdef.png')).toThrow(
      NotFoundException,
    );
  });
});
