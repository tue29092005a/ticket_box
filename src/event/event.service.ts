import {
  Injectable,
  Inject,
  Logger,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { REDIS_CLIENT } from '../config/redis.config';
import { EVENT_PUBLISHER, IEventPublisher } from './interfaces/event-publisher.interface';
import { Concert, ConcertStatus } from '../info/entities/concert.entity';
import { EventTicketType } from '../info/entities/event-ticket-type.entity';
import { SeatInventory } from '../info/entities/seat-inventory.entity';
import { ShowInfo, ShowInfoDocument } from '../info/schemas/show-info.schema';

import { SaveStep1Dto } from './dto/save-step1.dto';
import { SaveStep2Dto } from './dto/save-step2.dto';
import { SaveStep3Dto } from './dto/save-step3.dto';
import { SaveStep4Dto } from './dto/save-step4.dto';
import { UpdateEventDto } from './dto/update-event.dto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @InjectRepository(EventTicketType) private readonly ticketTypeRepo: Repository<EventTicketType>,
    @InjectRepository(SeatInventory) private readonly seatRepo: Repository<SeatInventory>,
    @InjectModel(ShowInfo.name) private readonly showInfoModel: Model<ShowInfoDocument>,
    private readonly dataSource: DataSource,
  ) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async createDraft(organizerId: string) {
    const concert = this.concertRepo.create({
      organizer_id: organizerId,
      status: ConcertStatus.DRAFT,
      current_step: 1,
    });
    const saved = await this.concertRepo.save(concert);
    await this.showInfoModel.create({ showId: saved.id });
    return {
      event_id: saved.id,
      status: ConcertStatus.DRAFT,
      current_step: 1,
      message: 'Draft created. Proceed to fill step 1.',
    };
  }

  async saveStep(eventId: string, step: number, data: any, organizerId: string) {
    const concert = await this.concertRepo.findOne({ where: { id: eventId } });
    if (!concert) throw new NotFoundException('Event not found.');
    if (concert.organizer_id !== organizerId)
      throw new ForbiddenException('You are not the owner of this event.');

    if (step === 1) await this._saveStep1(eventId, data as SaveStep1Dto);
    else if (step === 2) await this._saveStep2(eventId, data as SaveStep2Dto);
    else if (step === 3) await this._saveStep3(eventId, data as SaveStep3Dto);
    else if (step === 4) await this._saveStep4(eventId, data as SaveStep4Dto);

    await this.concertRepo.update(eventId, { current_step: step });

    const draftKey = `draft:${eventId}`;
    const existing = JSON.parse((await this.redis.get(draftKey)) || '{}');
    existing[`step_${step}`] = data;
    existing.current_step = step;
    await this.redis.setex(draftKey, 86400, JSON.stringify(existing));

    if (step === 4) {
      await this.concertRepo.update(eventId, { status: ConcertStatus.ACTIVE });
      await this.redis.del(draftKey);
      await this._invalidateEventListCache();
      await this.eventPublisher.publish('EVENT_PUBLISHED', { event_id: eventId });

      const info = await this.showInfoModel.findOne({ showId: eventId }).lean();
      return {
        event_id: eventId,
        status: ConcertStatus.ACTIVE,
        message: 'Event published successfully.',
        event_url: `https://ticketbox.vn/${info?.['privacy'] === 'PRIVATE' ? '(private)' : concert.slug || eventId}`,
      };
    }

    return {
      event_id: eventId,
      status: ConcertStatus.DRAFT,
      step_completed: step,
      next_step: step + 1,
      ...(step === 2 ? { ticket_types_saved: (data as SaveStep2Dto).ticket_types?.length ?? 0 } : {}),
      ...(step === 3 ? { event_url: `https://ticketbox.vn/${(data as SaveStep3Dto).slug}` } : {}),
    };
  }

  private async _saveStep1(eventId: string, data: SaveStep1Dto) {
    await this.showInfoModel.updateOne({ showId: eventId }, { $set: { ...data } }, { upsert: true });
  }

  private async _saveStep2(eventId: string, data: SaveStep2Dto) {
    await this.concertRepo.update(eventId, { performanceDate: new Date(data.start_time) });
    await this.ticketTypeRepo.delete({ showId: eventId });
    if (data.ticket_types?.length) {
      const entities = data.ticket_types.map((tt, idx) =>
        this.ticketTypeRepo.create({
          showId: eventId,
          name: tt.name,
          price: tt.is_free ? 0 : tt.price,
          is_free: tt.is_free,
          total_quantity: tt.total_quantity,
          min_per_order: tt.min_per_order ?? 1,
          max_per_order: tt.max_per_order ?? 10,
          sale_start: tt.sale_start ? new Date(tt.sale_start) : null,
          sale_end: tt.sale_end ? new Date(tt.sale_end) : null,
          description: tt.description ?? null,
          ticket_image_url: tt.ticket_image_url ?? null,
          sort_order: idx,
        }),
      );
      await this.ticketTypeRepo.save(entities);
    }
  }

  private async _saveStep3(eventId: string, data: SaveStep3Dto) {
    const isAvailable = await this.checkSlugAvailability(data.slug, eventId);
    if (!isAvailable) throw new ConflictException({ error: 'slug_taken' });
    await this.concertRepo.update(eventId, { slug: data.slug });
    await this.showInfoModel.updateOne(
      { showId: eventId },
      { $set: { privacy: data.privacy, confirmation_message: data.confirmation_message } },
      { upsert: true },
    );
  }

  private async _saveStep4(eventId: string, data: SaveStep4Dto) {
    await this.showInfoModel.updateOne({ showId: eventId }, { $set: { ...data } }, { upsert: true });
  }

  async getDraft(eventId: string, organizerId: string) {
    const concert = await this.concertRepo.findOne({ where: { id: eventId } });
    if (!concert) throw new NotFoundException('Event not found.');
    if (concert.organizer_id !== organizerId)
      throw new ForbiddenException('You are not the owner of this event.');

    const draftKey = `draft:${eventId}`;
    const cached = await this.redis.get(draftKey);
    if (cached) return { event_id: eventId, ...JSON.parse(cached) };

    const info = await this.showInfoModel.findOne({ showId: eventId }).lean();
    const ticketTypes = await this.ticketTypeRepo.find({ where: { showId: eventId } });

    return {
      event_id: eventId,
      status: concert.status,
      current_step: concert.current_step,
      step_1: info
        ? {
            name: info['name'], category: info['category'], address_type: info['address_type'],
            venue_name: info['venue_name'], province: info['province'], ward: info['ward'],
            street: info['street'], image_url: info['image_url'], cover_image_url: info['cover_image_url'],
            organizer_name: info['organizer_name'], organizer_info: info['organizer_info'],
            organizer_logo_url: info['organizer_logo_url'], description: info['description'],
          }
        : null,
      step_2: concert.performanceDate ? { start_time: concert.performanceDate, ticket_types: ticketTypes } : null,
      step_3: info?.['privacy'] ? { slug: concert.slug, privacy: info['privacy'], confirmation_message: info['confirmation_message'] } : null,
      step_4: info?.['bank_account_name']
        ? {
            bank_account_name: info['bank_account_name'], bank_account_number: info['bank_account_number'],
            bank_name: info['bank_name'], bank_branch: info['bank_branch'],
            vat_business_type: info['vat_business_type'], vat_full_name: info['vat_full_name'],
            vat_address: info['vat_address'], vat_tax_code: info['vat_tax_code'],
          }
        : null,
    };
  }

  async saveImageFile(eventId: string, file: Express.Multer.File, type: string): Promise<{ url: string; type: string }> {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${eventId}_${type}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    const dest = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(dest, file.buffer);
    const url = `/uploads/${filename}`;
    this.logger.log(`Saved upload: ${url}`);
    return { url, type };
  }

  async getEventList(page = 1, limit = 20) {
    const cacheKey = `event_list:${page}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return { ...JSON.parse(cached), cached_at: new Date().toISOString(), cache_ttl: 300 };

    const [concerts, total] = await this.concertRepo.findAndCount({
      where: { status: ConcertStatus.ACTIVE },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const showIds = concerts.map(c => c.id);
    const infos = showIds.length ? await this.showInfoModel.find({ showId: { $in: showIds } }).lean() : [];
    const infoMap = new Map(infos.map(i => [i['showId'], i]));

    const data = concerts.map(c => {
      const info = infoMap.get(c.id) || {};
      return {
        id: c.id,
        name: info['name'] ?? null,
        date: c.performanceDate,
        start_time: c.performanceDate,
        venue_name: info['venue_name'] ?? null,
        province: info['province'] ?? null,
        image_url: info['image_url'] ?? null,
        cover_image_url: info['cover_image_url'] ?? null,
        category: info['category'] ?? null,
        status: c.status,
        privacy: info['privacy'] ?? 'PUBLIC',
        slug: c.slug,
      };
    });

    const result = { data, total, page, limit };
    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  async getEventDetail(eventId: string): Promise<any> {
    const cacheKey = `event:${eventId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return { ...JSON.parse(cached), cache_hit: true, cache_ttl: 600 };

    const lockKey = `cache_lock:${eventId}`;
    const lockValue = crypto.randomUUID();
    const gotLock = await this.redis.set(lockKey, lockValue, 'EX', 30, 'NX');

    if (gotLock) {
      try {
        const concert = await this.concertRepo.findOne({ where: { id: eventId } });
        if (!concert) throw new NotFoundException('Event not found.');

        const [info, ticketTypes] = await Promise.all([
          this.showInfoModel.findOne({ showId: eventId }).lean(),
          this.ticketTypeRepo.find({ where: { showId: eventId }, order: { sort_order: 'ASC' } }),
        ]);

        const enriched = await Promise.all(
          ticketTypes.map(async tt => {
            const countKey = `seat_counts:${eventId}:${tt.name}`;
            let counts = await this.redis.hgetall(countKey);

            if (!counts || Object.keys(counts).length === 0) {
              const rows = await this.dataSource.query(
                `SELECT status, COUNT(*)::int AS cnt FROM seat_inventory WHERE "showId" = $1 AND zone = $2 GROUP BY status`,
                [eventId, tt.name],
              );
              counts = { available: '0', reserved: '0', sold: '0', locked: '0' };
              for (const row of rows) counts[row.status.toLowerCase()] = String(row.cnt);
              await this.redis.hmset(countKey, counts);
              await this.redis.expire(countKey, 10);
            }

            return {
              id: tt.id,
              name: tt.name,
              price: tt.price,
              is_free: tt.is_free,
              total_quantity: tt.total_quantity,
              available: Number(counts.available ?? 0),
              reserved: Number(counts.reserved ?? 0),
              sold: Number(counts.sold ?? 0),
              locked: Number(counts.locked ?? 0),
              min_per_order: tt.min_per_order,
              max_per_order: tt.max_per_order,
              sale_start: tt.sale_start,
              sale_end: tt.sale_end,
              description: tt.description,
              ticket_image_url: tt.ticket_image_url,
            };
          }),
        );

        const result = {
          id: concert.id,
          name: info?.['name'] ?? null,
          description: info?.['description'] ?? null,
          category: info?.['category'] ?? null,
          address_type: info?.['address_type'] ?? null,
          venue_name: info?.['venue_name'] ?? null,
          province: info?.['province'] ?? null,
          ward: info?.['ward'] ?? null,
          street: info?.['street'] ?? null,
          image_url: info?.['image_url'] ?? null,
          cover_image_url: info?.['cover_image_url'] ?? null,
          organizer_name: info?.['organizer_name'] ?? null,
          organizer_info: info?.['organizer_info'] ?? null,
          organizer_logo_url: info?.['organizer_logo_url'] ?? null,
          privacy: info?.['privacy'] ?? 'PUBLIC',
          slug: concert.slug,
          status: concert.status,
          start_time: concert.performanceDate,
          ticket_types: enriched,
          created_at: concert.created_at,
        };

        await this.redis.setex(cacheKey, 600, JSON.stringify(result));
        return { ...result, cache_hit: false };
      } finally {
        const stored = await this.redis.get(lockKey);
        if (stored === lockValue) await this.redis.del(lockKey);
      }
    } else {
      await new Promise(r => setTimeout(r, 150));
      return this.getEventDetail(eventId);
    }
  }

  async updateEvent(eventId: string, data: UpdateEventDto, userId: string) {
    const concert = await this.concertRepo.findOne({ where: { id: eventId } });
    if (!concert) throw new NotFoundException('Event not found.');

    if (data.slug && data.slug !== concert.slug) {
      const available = await this.checkSlugAvailability(data.slug, eventId);
      if (!available) throw new ConflictException({ error: 'slug_taken' });
      await this.concertRepo.update(eventId, { slug: data.slug });
    }

    const { slug, ...mongoFields } = data;
    if (Object.keys(mongoFields).length > 0) {
      await this.showInfoModel.updateOne({ showId: eventId }, { $set: mongoFields }, { upsert: true });
    }

    await this._invalidateConcertCache(eventId);
    return this.getEventDetail(eventId);
  }

  async cancelEvent(eventId: string) {
    const concert = await this.concertRepo.findOne({ where: { id: eventId } });
    if (!concert) throw new NotFoundException('Event not found.');

    await this.concertRepo.update(eventId, { status: ConcertStatus.CANCELLED });
    await this._invalidateConcertCache(eventId);
    await this.eventPublisher.publish('EVENT_CANCELLED', { event_id: eventId });

    return { id: eventId, status: ConcertStatus.CANCELLED, message: 'Event cancelled. Refund process initiated.' };
  }

  async checkSlugAvailability(slug: string, eventId: string): Promise<boolean> {
    const cacheKey = `slug_check:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached === 'available';

    const existing = await this.concertRepo.createQueryBuilder('c').where('c.slug = :slug AND c.id != :eventId', { slug, eventId }).getOne();
    const available = !existing;
    await this.redis.setex(cacheKey, 60, available ? 'available' : 'taken');
    return available;
  }

  async updateGASeatCounts(eventId: string, zone: string, available: number, reserved: number, sold: number) {
    const key = `seat_counts:${eventId}:${zone}`;
    await this.redis.hmset(key, { available: String(available), reserved: String(reserved), sold: String(sold) });
    await this.redis.expire(key, 10);
    await this.redis.del(`event:${eventId}`);
    return { updated: true };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expireStaleReservations() {
    const result = await this.dataSource.query(`
      UPDATE seat_inventory SET status = 'AVAILABLE', "reservedBy" = NULL, "expiryTime" = NULL
      WHERE status = 'RESERVED' AND "expiryTime" < NOW() RETURNING "showId", zone
    `);

    if (!result.length) return;

    const affected = [...new Set(result.map((r: any) => `${r.showId}:${r.zone}`))];
    for (const key of affected) {
      const [showId, zone] = (key as string).split(':');
      await this.redis.del(`seat_counts:${showId}:${zone}`);
      await this.redis.del(`event:${showId}`);
    }
    this.logger.log(`Expired ${result.length} stale seat reservations.`);
  }

  private async _invalidateEventListCache() {
    const keys = await this.redis.keys('event_list:*');
    if (keys.length) await this.redis.del(...keys);
  }

  private async _invalidateConcertCache(eventId: string) {
    await this._invalidateEventListCache();
    await this.redis.del(`event:${eventId}`);
    await this.redis.del(`slug_check:*`);
  }
}
