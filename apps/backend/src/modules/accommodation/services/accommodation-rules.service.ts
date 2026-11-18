import {
  HARD_ATTRIBUTE_OPTIONS,
  HardAttributeOption,
} from '@/modules/accommodation/domain/determination';
import { AccommodationRulesRepository } from '@/modules/accommodation/repositories/accommodation-rules.repository';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

/** A foreign or missing event looks the same (§3.2). */
const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

export type HardAttributeSetting = {
  /** The chosen attribute; null when rooms are not split by one. */
  hardAttribute: string | null;
  options: readonly HardAttributeOption[];
};

/**
 * Pravidla ubytování → tvrdý atribut (#384): none or one categorical
 * question splits rooms. The term evaluation and the room proposal use it.
 */
@Injectable()
export class AccommodationRulesService {
  constructor(private readonly repository: AccommodationRulesRepository) {}

  async hardAttribute(scope: EventScope): Promise<HardAttributeSetting> {
    const hardAttribute = await this.repository.findHardAttribute(scope);
    if (hardAttribute === undefined) throw notAvailable();
    return { hardAttribute, options: HARD_ATTRIBUTE_OPTIONS };
  }

  /** `attribute` is one of the options (validated) or null. */
  async saveHardAttribute(
    scope: EventScope,
    attribute: string | null,
  ): Promise<HardAttributeSetting> {
    const option =
      attribute === null
        ? null
        : (HARD_ATTRIBUTE_OPTIONS.find((o) => o.attribute === attribute) ??
          null);
    const saved = await this.repository.saveHardAttribute(scope, option);
    if (saved === null) throw notAvailable();
    return {
      hardAttribute: option?.attribute ?? null,
      options: HARD_ATTRIBUTE_OPTIONS,
    };
  }
}
