import { EventAttribute } from '@/modules/accommodation/domain/attributes';
import {
  preferenceItems,
  softAttributeOptions,
  SoftPreferenceItem,
  WISHES_PREFERENCE,
} from '@/modules/accommodation/domain/room-proposal-preferences';
import {
  AccommodationRulesRepository,
  HardAttributeChoice,
  StoredHardAttribute,
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

/** The hard attribute and every categorical question of the event (#384, #485). */
export type HardAttributeSetting = StoredHardAttribute;

/** The soft preferences of the room proposal (#389) and what can be ranked. */
export type PreferencesSetting = {
  /** Ranked, most important first; empty when the proposal skips U3. */
  preferences: SoftPreferenceItem[];
  /** "Přání" and the soft attributes the organizer can add; never the hard attribute. */
  wishes: typeof WISHES_PREFERENCE;
  attributes: EventAttribute[];
};

const settingOf = (stored: StoredPreferences): PreferencesSetting => ({
  preferences: preferenceItems(stored.softAttributes, stored.softNeutralValues),
  wishes: WISHES_PREFERENCE,
  attributes: softAttributeOptions(stored.attributes, stored.hardAttribute),
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
    const setting = await this.repository.findHardAttribute(scope);
    if (setting === undefined) throw notAvailable();
    return setting;
  }

  /** A question of the event and its answers that decide no room, or null for none. */
  async saveHardAttribute(
    scope: EventScope,
    choice: HardAttributeChoice | null,
  ): Promise<HardAttributeSetting> {
    const saved = await this.repository.saveHardAttribute(scope, choice);
    if (saved === null) throw notAvailable();
    if (saved === 'invalid')
      throw new BadRequestException(
        'Vyberte tvrdý atribut a jeho odpovědi z nabídky, nebo žádný.',
      );
    return this.hardAttribute(scope);
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
    const saved = await this.repository.savePreferences(scope, items);
    if (saved === null) throw notAvailable();
    if (saved.result === 'invalid')
      throw new BadRequestException(saved.message);
    if (saved.result === 'hardAttribute')
      throw new ConflictException(HARD_ATTRIBUTE_IN_LIST);
    return settingOf(saved.preferences);
  }
}
