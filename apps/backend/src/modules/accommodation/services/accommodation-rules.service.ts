import {
  HARD_ATTRIBUTE_OPTIONS,
  HardAttributeOption,
} from '@/modules/accommodation/domain/determination';
import {
  invalidPreferences,
  preferenceItems,
  SoftAttributeOption,
  softAttributeOptions,
  SoftPreferenceItem,
  storedPreferences,
  WISHES_PREFERENCE,
} from '@/modules/accommodation/domain/room-proposal-preferences';
import {
  AccommodationRulesRepository,
  StoredPreferences,
} from '@/modules/accommodation/repositories/accommodation-rules.repository';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** A foreign or missing event looks the same (§3.2). */
const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

export type HardAttributeSetting = {
  /** The chosen attribute; null when rooms are not split by one. */
  hardAttribute: string | null;
  options: readonly HardAttributeOption[];
};

/** The soft preferences of the room proposal (#389) and what can be ranked. */
export type PreferencesSetting = {
  /** Ranked, most important first; empty when the proposal skips U3. */
  preferences: SoftPreferenceItem[];
  /** "Přání" and the soft attributes the organizer can add; never the hard attribute. */
  wishes: typeof WISHES_PREFERENCE;
  attributes: SoftAttributeOption[];
};

const settingOf = (stored: StoredPreferences): PreferencesSetting => ({
  preferences: preferenceItems(stored.softAttributes, stored.softNeutralValues),
  wishes: WISHES_PREFERENCE,
  attributes: softAttributeOptions(stored.hardAttribute),
});

const HARD_ATTRIBUTE_IN_LIST =
  'Tvrdé pravidlo nelze přidat mezi měkké preference.';

/**
 * Pravidla ubytování (#384, #389): none or one categorical question splits
 * rooms, and the room proposal ranks its soft preferences. The term
 * evaluation uses the hard attribute; the room proposal uses both.
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

  async preferences(scope: EventScope): Promise<PreferencesSetting> {
    const stored = await this.repository.findPreferences(scope);
    if (!stored) throw notAvailable();
    return settingOf(stored);
  }

  /**
   * Saves the ranked list (#389). It makes every room proposal of the event
   * stale; the evaluation of participation stays as it is.
   */
  async savePreferences(
    scope: EventScope,
    items: readonly { id: string; neutralValues?: readonly string[] }[],
  ): Promise<PreferencesSetting> {
    const invalid = invalidPreferences(items);
    if (invalid) throw new BadRequestException(invalid);
    const saved = await this.repository.savePreferences(
      scope,
      storedPreferences(items),
    );
    if (saved === null) throw notAvailable();
    if (saved.result === 'hardAttribute')
      throw new ConflictException(HARD_ATTRIBUTE_IN_LIST);
    return settingOf(saved.preferences);
  }
}
