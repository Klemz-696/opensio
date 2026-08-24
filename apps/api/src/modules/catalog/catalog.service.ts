import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogCacheService } from './catalog-cache.service';
import { LessonReaderService } from './lesson-reader.service';
import type {
  LessonDetailDto,
  ModuleDetailDto,
  ModuleSummaryDto,
  TrackSummaryDto,
} from './dto/catalog-responses.dto';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CatalogCacheService) private readonly cache: CatalogCacheService,
    @Inject(LessonReaderService) private readonly lessonReader: LessonReaderService,
  ) {}

  /**
   * Récupère toutes les années de formation (tracks) ordonnées par position.
   * Note Lot 4 : La progression agrégée arrive au Lot 6 (B08).
   * La structure est livrée sans calcul de pourcentages.
   */
  async getTracks(): Promise<TrackSummaryDto[]> {
    const cacheKey = 'tracks:all';
    const cached = this.cache.get<TrackSummaryDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const tracks = await this.prisma.track.findMany({
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { modules: true },
        },
      },
    });

    const result: TrackSummaryDto[] = tracks.map((track) => ({
      id: track.id,
      slug: track.slug,
      title: track.title,
      description: track.description,
      position: track.position,
      modulesCount: track._count.modules,
      progress: null,
    }));

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Récupère tous les modules d'une année de formation spécifique.
   */
  async getModulesByTrack(trackSlug: string): Promise<ModuleSummaryDto[]> {
    const normalizedSlug = trackSlug.toLowerCase().trim();
    const cacheKey = `track_modules:${normalizedSlug}`;
    const cached = this.cache.get<ModuleSummaryDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const track = await this.prisma.track.findUnique({
      where: { slug: normalizedSlug },
    });

    if (!track) {
      throw new NotFoundException(`Année de formation introuvable : ${trackSlug}`);
    }

    const modules = await this.prisma.module.findMany({
      where: { trackId: track.id },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { lessons: true },
        },
      },
    });

    const result: ModuleSummaryDto[] = modules.map((mod) => ({
      id: mod.id,
      slug: mod.slug,
      title: mod.title,
      description: mod.description,
      position: mod.position,
      difficulty: mod.difficulty,
      estimatedMinutes: mod.estimatedMinutes,
      competencyRefs: (mod.competencyRefs as string[]) || [],
      trackSlug: track.slug,
      lessonsCount: mod._count.lessons,
    }));

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Récupère le détail d'un module par son slug (leçons, quiz, labs).
   */
  async getModuleBySlug(moduleSlug: string): Promise<ModuleDetailDto> {
    const normalizedSlug = moduleSlug.toLowerCase().trim();
    const cacheKey = `module_detail:${normalizedSlug}`;
    const cached = this.cache.get<ModuleDetailDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const mod = await this.prisma.module.findUnique({
      where: { slug: normalizedSlug },
      include: {
        track: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        lessons: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
            estimatedMinutes: true,
            position: true,
          },
        },
        quizzes: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            passingScore: true,
            position: true,
            _count: {
              select: { questions: true },
            },
          },
        },
        labs: {
          orderBy: { slug: 'asc' },
          select: {
            id: true,
            slug: true,
            title: true,
            level: true,
            maxScore: true,
            estimatedMinutes: true,
          },
        },
      },
    });

    if (!mod) {
      throw new NotFoundException(`Module introuvable : ${moduleSlug}`);
    }

    const result: ModuleDetailDto = {
      id: mod.id,
      slug: mod.slug,
      title: mod.title,
      description: mod.description,
      position: mod.position,
      difficulty: mod.difficulty,
      estimatedMinutes: mod.estimatedMinutes,
      competencyRefs: (mod.competencyRefs as string[]) || [],
      track: {
        id: mod.track.id,
        slug: mod.track.slug,
        title: mod.track.title,
      },
      lessons: mod.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        position: lesson.position,
      })),
      quizzes: mod.quizzes.map((quiz) => ({
        id: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        passingScore: quiz.passingScore,
        position: quiz.position,
        questionsCount: quiz._count.questions,
      })),
      labs: mod.labs.map((lab) => ({
        id: lab.id,
        slug: lab.slug,
        title: lab.title,
        level: lab.level,
        maxScore: lab.maxScore,
        estimatedMinutes: lab.estimatedMinutes,
      })),
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Récupère une leçon complète avec son contenu Markdown lu de manière sécurisée.
   */
  async getLessonBySlug(lessonSlug: string): Promise<LessonDetailDto> {
    const normalizedSlug = lessonSlug.toLowerCase().trim();
    const cacheKey = `lesson_detail:${normalizedSlug}`;
    const cached = this.cache.get<LessonDetailDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { slug: normalizedSlug },
      include: {
        module: {
          select: {
            id: true,
            slug: true,
            title: true,
            track: {
              select: {
                slug: true,
              },
            },
          },
        },
        lessonLabs: {
          orderBy: { position: 'asc' },
          include: {
            lab: {
              select: {
                id: true,
                slug: true,
                title: true,
                level: true,
                maxScore: true,
                estimatedMinutes: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(`Leçon introuvable : ${lessonSlug}`);
    }

    // Lecture sécurisée du contenu Markdown sur le système de fichiers
    const markdownContent = await this.lessonReader.readLessonMarkdown(
      lesson.contentPath,
    );

    const result: LessonDetailDto = {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      difficulty: lesson.difficulty,
      estimatedMinutes: lesson.estimatedMinutes,
      position: lesson.position,
      objectives: (lesson.objectives as string[]) || [],
      prerequisites: (lesson.prerequisites as string[]) || [],
      competencyRefs: (lesson.successCriteria as string[]) || [],
      successCriteria: (lesson.successCriteria as string[]) || [],
      content: markdownContent,
      module: {
        id: lesson.module.id,
        slug: lesson.module.slug,
        title: lesson.module.title,
        trackSlug: lesson.module.track.slug,
      },
      relatedLabs: lesson.lessonLabs.map((ll) => ({
        id: ll.lab.id,
        slug: ll.lab.slug,
        title: ll.lab.title,
        level: ll.lab.level,
        maxScore: ll.lab.maxScore,
        estimatedMinutes: ll.lab.estimatedMinutes,
      })),
    };

    this.cache.set(cacheKey, result);
    return result;
  }
}
