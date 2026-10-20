import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

export type CategoryKind = 'business' | 'product';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Admin CRUD for business and product categories. Every change is audit-logged. */
@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private model(kind: CategoryKind): any {
    if (kind === 'business') return this.prisma.businessCategory;
    if (kind === 'product') return this.prisma.productCategory;
    throw new BadRequestException('Onbekend categorietype');
  }

  async list(kind: CategoryKind) {
    const usage = kind === 'business' ? { _count: { select: { businesses: true, Business: true } } } : { _count: { select: { products: true } } };
    const rows = await this.model(kind).findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: usage });
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      active: r.active,
      sortOrder: r.sortOrder,
      usage: kind === 'business' ? r._count.businesses + r._count.Business : r._count.products,
    }));
  }

  async create(adminUserId: string, kind: CategoryKind, dto: CreateCategoryDto) {
    const slug = dto.slug ?? slugify(dto.name);
    if (!slug) throw new BadRequestException('Ongeldige naam');
    try {
      const created = await this.model(kind).create({
        data: { name: dto.name.trim(), slug, description: dto.description?.trim() || null, sortOrder: dto.sortOrder ?? 0 },
      });
      await this.audit(adminUserId, 'CATEGORY_CREATED', kind, created.id, { slug });
      return created;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Er bestaat al een categorie met deze slug');
      }
      throw err;
    }
  }

  async update(adminUserId: string, kind: CategoryKind, id: string, dto: UpdateCategoryDto) {
    const existing = await this.model(kind).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categorie niet gevonden');
    const updated = await this.model(kind).update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
    await this.audit(adminUserId, 'CATEGORY_UPDATED', kind, id, { fields: Object.keys(dto) });
    return updated;
  }

  /** Only unused categories can be removed; otherwise deactivate them. */
  async remove(adminUserId: string, kind: CategoryKind, id: string) {
    const usage =
      kind === 'business'
        ? (await this.prisma.business.count({ where: { categoryId: id } })) +
          (await this.prisma.businessesWithCategories.count({ where: { categoryId: id } }))
        : await this.prisma.product.count({ where: { categoryId: id } });
    if (usage > 0) throw new ConflictException(`Categorie is in gebruik (${usage}). Zet haar op inactief in plaats van verwijderen.`);
    const existing = await this.model(kind).findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categorie niet gevonden');
    await this.model(kind).delete({ where: { id } });
    await this.audit(adminUserId, 'CATEGORY_DELETED', kind, id, { slug: existing.slug });
    return { id };
  }

  private audit(actorUserId: string, action: string, kind: CategoryKind, targetId: string, metadata: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: { actorUserId, action, targetType: `${kind}Category`, targetId, metadata: metadata as Prisma.InputJsonValue },
    });
  }
}
